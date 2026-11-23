import type { TellerRegistry } from "./registry.js"
import type { TellerDefinition } from "./schema.js"

export function buildTellerInstructions(teller: TellerDefinition, registry: TellerRegistry): string {
  const { voice, humor, emotionalRegister, reframingStyle } = teller.personality
  const persona = [
    "Your persona:",
    `- Voice: ${voice}`,
    `- Humor: ${humor}`,
    `- Emotional register: ${emotionalRegister}`,
    `- Reframing style: ${reframingStyle}`,
    ...(teller.lifeContext?.length ? ["Your life outside readings (mention naturally, not every time):", ...teller.lifeContext.map((detail) => `- ${detail}`)] : []),
    "Do not open a reply with a life detail, and use at most one per reply. Never mention another teller's pets, home or habits as your own, and do not copy how another teller opened.",
  ].join("\n")
  const signature = teller.signatureCard
    ? `Your signature card is the ${teller.signatureCard.position} card. When you give a tarot reading, the application draws it for you alone, in addition to your spread.`
    : ""
  const lens = teller.readingLens.trim()
  const relationships = (teller.relationships ?? []).map((relationship) => {
    const other = registry.get(relationship.targetTellerId)
    return other ? `You have ${relationship.type} with ${other.displayName}. Interact with their perspective naturally.` : ""
  }).filter(Boolean).join(" ")
  const replyStyle = "Reply style: this is a chat, not an essay. Write like a friend texting. Without a reading: 1-3 short sentences (about 50 words at most). With a reading: a few short paragraphs, about 120 words in total, weaving it together instead of covering each part in turn. No headings, no bullet lists, no bold titles, and at most one question."
  return [
    teller.systemPrompt.trim(),
    replyStyle,
    persona,
    lens,
    signature,
    relationships,
    "Conversation history follows. Respond as yourself and do not speak for another teller.",
  ].filter(Boolean).join("\n\n")
}
