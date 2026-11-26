// Prove a teller's call voice works: synthesize through the backend's /api/tts (the same
// path a call uses), transcribe the audio with the sidecar's Whisper, compare the words.
// Usage: node .claude/skills/teller-call-assets/voice-roundtrip.mjs <tellerId> ["sentence"] [--keep out.wav]
import { writeFileSync } from "node:fs"

const args = process.argv.slice(2)
const keepAt = args.indexOf("--keep")
const keep = keepAt >= 0 ? args.splice(keepAt, 2)[1] : null
const [tellerId, text = "Right, let's take this one small step at a time and see what it tells us."] = args
if (!tellerId) { console.error("usage: voice-roundtrip.mjs <tellerId> [sentence] [--keep out.wav]"); process.exit(2) }
const agent = process.env.AGENT_URL ?? "http://127.0.0.1:4000"
const sidecar = process.env.TTS_BASE_URL ?? "http://127.0.0.1:4100"

const started = Date.now()
const tts = await fetch(`${agent}/api/tts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tellerId, text }) })
if (!tts.ok) {
  const hint = { 404: "teller has no call.voice, or the backend is an old build (rebuild + restart)", 503: "sidecar down (pnpm tts) or voices/<voice>.wav missing" }[tts.status] ?? ""
  console.log(`FAIL /api/tts ${tts.status} ${await tts.text()} ${hint}`); process.exit(1)
}
const wav = Buffer.from(await tts.arrayBuffer())
console.log(`tts ${tts.status} ${tts.headers.get("content-type")} ${(wav.length / 1024).toFixed(0)} KB in ${Date.now() - started} ms`)
if (keep) { writeFileSync(keep, wav); console.log(`saved ${keep}`) }

const stt = await fetch(`${sidecar}/transcribe`, { method: "POST", headers: { "content-type": "audio/wav" }, body: wav })
if (!stt.ok) { console.log(`FAIL /transcribe ${stt.status} ${await stt.text()} (WHISPER_MODEL_PATH set?)`); process.exit(1) }
const heard = (await stt.json()).text

const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean)
const said = words(text), got = new Set(words(heard))
const matched = said.filter((w) => got.has(w)).length
const score = matched / said.length
console.log(`said:  ${text}`)
console.log(`heard: ${heard}`)
console.log(`${matched}/${said.length} words (${Math.round(score * 100)}%)`)
console.log(score >= 0.85 ? "OK voice works" : "FAIL transcript doesn't match — re-run make_voice.py (try --seed) or check the clip")
process.exitCode = score >= 0.85 ? 0 : 1
