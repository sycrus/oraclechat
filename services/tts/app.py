"""Oracle speech sidecar (ADR-0015): OmniVoice on the local GPU, bound to 127.0.0.1.

POST /synthesize {text, voice} -> audio/wav, cloned from voices/<voice>.wav (+ .txt transcript).
POST /transcribe  audio/wav -> {text}: owner speech, Whisper on the GPU (ADR-0016). Audio is never stored or logged.
GET  /health -> {ready, transcribe}
"""

import io
import logging
import os
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Callable, Protocol

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator

log = logging.getLogger("oracle-tts")
VOICES_DIR = Path(__file__).parent / "voices"


class Engine(Protocol):
    sample_rate: int

    def synthesize(self, text: str, voice_wav: Path, voice_text: str | None) -> np.ndarray: ...


class Transcriber(Protocol):
    def transcribe(self, audio: np.ndarray, sample_rate: int) -> str: ...


WHISPER_RATE = 16000
MAX_AUDIO_SECONDS = 30
MAX_AUDIO_BYTES = 2 * 1024 * 1024


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    voice: str = Field(pattern=r"^[a-z0-9-]+$")

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text is blank")
        return value


class OmniVoiceEngine:
    """Loads OmniVoice once and caches one clone prompt per voice file."""

    sample_rate = 24000

    def __init__(self, model_path: str):
        import torch
        from omnivoice import OmniVoice

        self._torch = torch
        self._model = OmniVoice.from_pretrained(model_path, device_map="cuda:0", dtype=torch.float16).eval()
        self._prompts: dict[tuple[Path, float], object] = {}

    def synthesize(self, text: str, voice_wav: Path, voice_text: str | None) -> np.ndarray:
        key = (voice_wav, voice_wav.stat().st_mtime)
        if key not in self._prompts:
            self._prompts[key] = self._model.create_voice_clone_prompt(ref_audio=str(voice_wav), ref_text=voice_text)
        with self._torch.inference_mode():
            audio = self._model.generate(text=text, language="English", voice_clone_prompt=self._prompts[key])[0]
        return np.asarray(audio.cpu().numpy() if hasattr(audio, "cpu") else audio, dtype=np.float32).reshape(-1)


class WhisperEngine:
    """Whisper (large-v3-turbo) through the transformers speech-recognition pipeline, English only."""

    def __init__(self, model_path: str):
        import torch
        from transformers import pipeline

        self._pipe = pipeline("automatic-speech-recognition", model=model_path, device="cuda:0", dtype=torch.float16)

    def transcribe(self, audio: np.ndarray, sample_rate: int) -> str:
        result = self._pipe({"raw": audio, "sampling_rate": sample_rate}, generate_kwargs={"language": "english", "task": "transcribe"})
        return str(result["text"]).strip()


def load_whisper() -> Transcriber:
    model_path = os.environ.get("WHISPER_MODEL_PATH")
    if not model_path:
        raise RuntimeError("WHISPER_MODEL_PATH is not set")
    return WhisperEngine(model_path)


def to_whisper_input(body: bytes) -> np.ndarray:
    """Decodes a WAV body to 16 kHz mono float32; ValueError for anything unusable."""
    if not body or len(body) > MAX_AUDIO_BYTES:
        raise ValueError("audio must be 1 byte to 2 MB")
    try:
        audio, rate = sf.read(io.BytesIO(body), dtype="float32", always_2d=True)
    except Exception as error:
        raise ValueError("not a WAV file") from error
    if len(audio) == 0:
        raise ValueError("empty audio")
    if len(audio) / rate > MAX_AUDIO_SECONDS:
        raise ValueError(f"audio over {MAX_AUDIO_SECONDS} s")
    mono = audio.mean(axis=1)
    if rate == WHISPER_RATE:
        return mono
    length = int(round(len(mono) * WHISPER_RATE / rate))
    return np.interp(np.linspace(0, len(mono) - 1, length), np.arange(len(mono)), mono).astype(np.float32)


def load_omnivoice() -> Engine:
    model_path = os.environ.get("OMNIVOICE_MODEL_PATH")
    if not model_path:
        raise RuntimeError("OMNIVOICE_MODEL_PATH is not set")
    return OmniVoiceEngine(model_path)


def create_app(
    voices_dir: Path = VOICES_DIR,
    load_engine: Callable[[], Engine] = load_omnivoice,
    load_transcriber: Callable[[], Transcriber] = load_whisper,
) -> FastAPI:
    state: dict[str, object] = {}
    lock = threading.Lock()  # one generation at a time on the GPU

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        try:
            state["engine"] = load_engine()
            log.warning("OmniVoice ready")
        except Exception:  # stays up and reports not ready; the backend shows "voice offline"
            log.exception("OmniVoice failed to load")
        try:
            state["transcriber"] = load_transcriber()
            log.warning("Whisper ready")
        except Exception:  # calls show "can't hear you" and typing still works
            log.exception("Whisper failed to load")
        yield

    app = FastAPI(lifespan=lifespan)

    @app.get("/health")
    def health():
        return {"ready": "engine" in state, "transcribe": "transcriber" in state}

    @app.post("/synthesize")
    def synthesize(request: SynthesizeRequest):  # sync def: FastAPI runs it in a worker thread
        engine = state.get("engine")
        if engine is None:
            raise HTTPException(503, "model not ready")
        voice_wav = voices_dir / f"{request.voice}.wav"
        if not voice_wav.is_file():
            raise HTTPException(404, "unknown voice")
        transcript = voices_dir / f"{request.voice}.txt"
        voice_text = transcript.read_text(encoding="utf-8").strip() if transcript.is_file() else None
        with lock:
            audio = engine.synthesize(request.text, voice_wav, voice_text)
        buffer = io.BytesIO()
        sf.write(buffer, audio, engine.sample_rate, format="WAV", subtype="PCM_16")
        return Response(buffer.getvalue(), media_type="audio/wav")

    @app.post("/transcribe")
    async def transcribe(request: Request):
        transcriber = state.get("transcriber")
        if transcriber is None:
            raise HTTPException(503, "transcription not ready")
        try:
            audio = to_whisper_input(await request.body())
        except ValueError as error:
            raise HTTPException(400, str(error)) from None

        def run() -> str:
            with lock:
                return transcriber.transcribe(audio, WHISPER_RATE)

        text = (await run_in_threadpool(run)).strip()
        return {"text": text if re.search(r"\w", text) else ""}

    return app


app = create_app()
