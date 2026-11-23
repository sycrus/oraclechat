import io

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from app import create_app


class FakeEngine:
    sample_rate = 24000

    def __init__(self):
        self.calls = []

    def synthesize(self, text, voice_wav, voice_text):
        self.calls.append((text, voice_wav.name, voice_text))
        return np.zeros(2400, dtype=np.float32)


@pytest.fixture
def voices(tmp_path):
    sf.write(tmp_path / "mira.wav", np.zeros(2400, dtype=np.float32), 24000)
    (tmp_path / "mira.txt").write_text("I am Mira.", encoding="utf-8")
    return tmp_path


class FakeTranscriber:
    def __init__(self, text="Should I start the novel this week?"):
        self.text = text
        self.calls = []

    def transcribe(self, audio, sample_rate):
        self.calls.append((len(audio), sample_rate, audio.ndim))
        return self.text


def no_transcriber():
    raise RuntimeError("WHISPER_MODEL_PATH is not set")


def client_for(voices, engine, transcriber=None):
    load_transcriber = (lambda: transcriber) if transcriber else no_transcriber
    return TestClient(create_app(voices_dir=voices, load_engine=lambda: engine, load_transcriber=load_transcriber))


def wav_bytes(seconds=1.0, rate=16000, channels=1):
    samples = np.full((int(seconds * rate), channels) if channels > 1 else int(seconds * rate), 0.1, dtype=np.float32)
    buffer = io.BytesIO()
    sf.write(buffer, samples, rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


def transcribe(client, body):
    return client.post("/transcribe", content=body, headers={"Content-Type": "audio/wav"})


def test_health_reports_ready_once_the_model_is_loaded(voices):
    with client_for(voices, FakeEngine()) as client:
        assert client.get("/health").json() == {"ready": True, "transcribe": False}


def test_synthesize_returns_wav_in_the_named_voice(voices):
    engine = FakeEngine()
    with client_for(voices, engine) as client:
        response = client.post("/synthesize", json={"text": "Hello, I'm Mira", "voice": "mira"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    audio, rate = sf.read(io.BytesIO(response.content))
    assert rate == 24000 and len(audio) == 2400
    assert engine.calls == [("Hello, I'm Mira", "mira.wav", "I am Mira.")]


def test_unknown_voice_is_404(voices):
    with client_for(voices, FakeEngine()) as client:
        assert client.post("/synthesize", json={"text": "Hi", "voice": "sage"}).status_code == 404


@pytest.mark.parametrize("voice", ["../mira", "Mira", "mira/../x", ""])
def test_voice_names_cannot_be_paths(voices, voice):
    with client_for(voices, FakeEngine()) as client:
        assert client.post("/synthesize", json={"text": "Hi", "voice": voice}).status_code == 422


@pytest.mark.parametrize("text", ["", "   ", "a" * 501])
def test_text_must_be_1_to_500_characters(voices, text):
    with client_for(voices, FakeEngine()) as client:
        assert client.post("/synthesize", json={"text": text, "voice": "mira"}).status_code == 422


def test_not_ready_is_503(voices):
    def failing_load():
        raise RuntimeError("no GPU")

    with TestClient(create_app(voices_dir=voices, load_engine=failing_load, load_transcriber=no_transcriber)) as client:
        assert client.get("/health").json() == {"ready": False, "transcribe": False}
        assert client.post("/synthesize", json={"text": "Hi", "voice": "mira"}).status_code == 503


def test_health_reports_transcription_once_whisper_is_loaded(voices):
    with client_for(voices, FakeEngine(), FakeTranscriber()) as client:
        assert client.get("/health").json() == {"ready": True, "transcribe": True}


def test_transcribe_returns_the_text_of_a_16k_wav(voices):
    transcriber = FakeTranscriber()
    with client_for(voices, FakeEngine(), transcriber) as client:
        response = transcribe(client, wav_bytes(1.0))
    assert response.status_code == 200
    assert response.json() == {"text": "Should I start the novel this week?"}
    assert transcriber.calls == [(16000, 16000, 1)]


def test_transcribe_mixes_and_resamples_48k_stereo_to_16k_mono(voices):
    transcriber = FakeTranscriber()
    with client_for(voices, FakeEngine(), transcriber) as client:
        assert transcribe(client, wav_bytes(0.5, rate=48000, channels=2)).status_code == 200
    assert transcriber.calls == [(8000, 16000, 1)]


@pytest.mark.parametrize("body", [b"", b"not a wav file", wav_bytes(0.0)])
def test_transcribe_rejects_garbage_and_empty_audio(voices, body):
    with client_for(voices, FakeEngine(), FakeTranscriber()) as client:
        assert transcribe(client, body).status_code == 400


def test_transcribe_rejects_audio_over_30_seconds(voices):
    with client_for(voices, FakeEngine(), FakeTranscriber()) as client:
        assert transcribe(client, wav_bytes(31.0, rate=8000)).status_code == 400


def test_transcribe_without_whisper_is_503(voices):
    with client_for(voices, FakeEngine()) as client:
        assert transcribe(client, wav_bytes(1.0)).status_code == 503


@pytest.mark.parametrize("raw", ["  ...  ", "", " ?! "])
def test_punctuation_only_transcripts_become_empty(voices, raw):
    with client_for(voices, FakeEngine(), FakeTranscriber(raw)) as client:
        assert transcribe(client, wav_bytes(1.0)).json() == {"text": ""}
