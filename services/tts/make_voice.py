"""Design a teller voice once and save it as the clone reference: voices/<name>.wav + .txt.

Rerun (optionally with another --seed) until it sounds right; calls then clone from the saved clip.
Instruct items OmniVoice accepts: female/male, child/teenager/young adult/middle-aged/elderly,
very low/low/moderate/high/very high pitch, whisper, <american|british|australian...> accent.

  .venv/Scripts/python make_voice.py mira --instruct "female, young adult, low pitch, american accent"
"""

import argparse
import os
from pathlib import Path

import soundfile as sf
import torch

SAMPLE = (
    "Okay, so the cards are not going to tell you what to do. "
    "But they will tell you what you already know, which is honestly more annoying."
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("name", help="voice name, e.g. mira")
    parser.add_argument("--instruct", required=True)
    parser.add_argument("--text", default=SAMPLE)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    from omnivoice import OmniVoice

    torch.manual_seed(args.seed)
    model = OmniVoice.from_pretrained(os.environ["OMNIVOICE_MODEL_PATH"], device_map="cuda:0", dtype=torch.float16).eval()
    with torch.inference_mode():
        audio = model.generate(text=args.text, language="English", instruct=args.instruct)[0]
    audio = audio.cpu().numpy() if hasattr(audio, "cpu") else audio

    voices = Path(__file__).parent / "voices"
    voices.mkdir(exist_ok=True)
    sf.write(voices / f"{args.name}.wav", audio.reshape(-1), 24000)
    (voices / f"{args.name}.txt").write_text(args.text, encoding="utf-8")
    print(f"saved voices/{args.name}.wav ({len(audio.reshape(-1)) / 24000:.1f}s)")


if __name__ == "__main__":
    main()
