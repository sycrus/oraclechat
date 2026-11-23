import type { TellerDefinition } from "../../src/tellers/schema.js"

/** A valid teller with no `call` section: the shipped tellers are all call-enabled, so tests that need
    the rejection path register this one (see tests/server/tts.test.ts, tests/chat/call-turn.test.ts, tests/server/app.test.ts). */
export const NO_CALL_TELLER: TellerDefinition = {
  id: "quiet-quill",
  displayName: "Quiet Quill",
  avatar: "/tellers/quiet-quill.png",
  discipline: "i-ching",
  gender: "non-binary",
  personality: { voice: "hushed", humor: "dry", emotionalRegister: "calm", reframingStyle: "quiet" },
  activationProfile: { topics: ["writing"], emotionalTones: ["calm"], situations: ["writers-block"] },
  readingLens: "Reads between the lines.",
  systemPrompt: "You are Quiet Quill, a test teller.",
}
