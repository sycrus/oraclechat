import { describe, expect, it } from "vitest"
import { chatTellers } from "./tellers"

describe("chatTellers", () => {
  it("gives every teller a 3D model, so calls are offered in one-to-one chats", () => {
    expect(chatTellers.map(({ id, model }) => ({ id, model }))).toEqual([
      { id: "mira-the-mystic", model: "/tellers/mira/mira.vrm" },
      { id: "sage-the-seer", model: "/tellers/sage/sage.vrm" },
      { id: "astra-the-astrologer", model: "/tellers/astra/astra.vrm" },
      { id: "milo-the-culture-guide", model: "/tellers/milo/milo.vrm" },
    ])
  })
})
