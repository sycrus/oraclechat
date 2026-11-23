export interface TarotCardContent {
  name: string
  upright: string
  reversed: string
  artKey: string
}

export const tarotContentProvenance = {
  interpretations: "Original Oracle interpretive copy, written for this project on 2026-11-18; no source text copied.",
  cardNames: "Traditional tarot card names and suit structure; interpreted in original Oracle language.",
  artwork: "Original pixel-art card faces created for Oracle (frontend/app/src/lib/pixel-tarot.ts); no third-party card illustrations used.",
} as const

const majors: TarotCardContent[] = [
  ["The Fool", "A beginning is asking for your trust, not your certainty. Take the first step while keeping your eyes open.", "Possibility is still present, though rushing may blur the risks. Pause long enough to make the next step deliberate."],
  ["The Magician", "Your tools and attention are enough to begin shaping an outcome. Choose one intention and put it to work.", "Your effort may be spread across too many promises. Bring your words and actions back into alignment."],
  ["The High Priestess", "Quiet observation may reveal what noise has covered. Give your own knowledge room before seeking another answer.", "A strong feeling needs checking against what you know. Let a little time separate intuition from assumption."],
  ["The Empress", "Care, beauty, and steady attention can help this grow. Offer nourishment without trying to control the result.", "You may be giving more than the situation can return. Refill your own reserves and let growth take its natural pace."],
  ["The Emperor", "A clear structure can make this feel manageable. Set a fair boundary and take responsibility for the part that is yours.", "Too much control can make a useful plan brittle. Keep the boundary; loosen your grip on how others must meet it."],
  ["The Hierophant", "A trusted practice or teacher may offer a useful starting point. Keep what serves you and ask questions about the rest.", "An inherited rule may no longer fit the person you are becoming. Give yourself permission to examine it."],
  ["The Lovers", "A meaningful choice asks you to act in line with your values. Honest connection starts with being honest with yourself.", "Mixed priorities are making closeness difficult. Name the difference before asking anyone to resolve it for you."],
  ["The Chariot", "Direction matters more than speed. Keep the competing parts of your life pointed toward the goal you chose.", "Momentum is pulling in several directions. Stop, choose a lane, and let progress be smaller but more intentional."],
  ["Strength", "Gentleness can hold firm without turning into force. Meet the difficult feeling with patience and a steady boundary.", "You do not need to prove your resilience by carrying everything. Ask for support before your patience is spent."],
  ["The Hermit", "A little solitude can help you hear your own answer. Step back long enough to distinguish your view from the crowd's.", "Reflection is useful, but isolation can become a loop. Choose one trusted person to let back into the conversation."],
  ["Wheel of Fortune", "Conditions are shifting, and not all of them are yours to command. Notice the opening and adapt your next move.", "A repeated pattern may be asking for a different response. Change one part you can influence rather than waiting for the cycle to end."],
  ["Justice", "A fair decision starts with the facts and includes your values. Be clear about what is owed, chosen, and repairable.", "The account may be incomplete or weighted by fear. Gather the missing detail before settling on a verdict."],
  ["The Hanged Man", "A pause can change what the problem looks like. Let go of one assumption and see what becomes visible.", "Waiting without a purpose is draining you. Decide what information you need and when you will act on it."],
  ["Death", "A chapter is ready to end so your attention can move elsewhere. Name what is finished and make room for the next shape.", "Holding on may be delaying a change you already recognize. Release one small piece rather than demanding a perfect ending."],
  ["Temperance", "A workable middle can be made from different needs. Adjust the pace and combine what is useful from each side.", "One part of life may be getting all the attention. Restore balance with a small, repeatable change."],
  ["The Devil", "Notice the bargain that keeps you tied to this pattern. Seeing the cost clearly gives you more choice than shame does.", "A grip is beginning to loosen. Keep the boundary that helped, and build support for the next difficult moment."],
  ["The Tower", "A sudden disruption can expose what was already unstable. Tend to what is immediate, then decide what deserves rebuilding.", "You may be sensing needed change before it becomes unavoidable. Address the strain directly while you still have options."],
  ["The Star", "Rest and perspective are returning in small amounts. Protect the practice that helps you feel connected to possibility.", "Hope may feel far away because you are tired. Choose one modest act of care rather than demanding optimism from yourself."],
  ["The Moon", "Uncertainty is real, but it is not proof of the worst outcome. Move slowly and check the story against what is known.", "A confusing picture is starting to clear. Keep asking careful questions until the facts feel steadier."],
  ["The Sun", "There is room for warmth, clarity, and uncomplicated joy here. Let yourself notice what is working without dismissing what remains hard.", "The light is present but may be partly obscured by pressure. Make space for one source of ease without forcing a celebration."],
  ["Judgement", "A useful review can help you answer the present with more honesty. Keep the lesson and leave the old self-criticism behind.", "You may be judging your past by information you only have now. Use what you learned to choose a kinder next step."],
  ["The World", "A meaningful cycle is reaching completion. Recognize what you have carried through and choose what you want to begin next.", "One loose end is asking for attention before you move on. Finish what matters and let the rest be imperfectly complete."],
].map(([name, upright, reversed], index) => ({
  name: name!, upright: upright!, reversed: reversed!, artKey: `major-${index}`,
}))

const suitDomains: Record<string, string> = {
  Wands: "creative energy, initiative, and the courage to experiment",
  Cups: "emotional connection, tenderness, and the work of receiving",
  Swords: "clear thought, honest language, and the choices words create",
  Pentacles: "resources, craft, the body, and the value of steady effort",
}

const rankReadings: Record<string, [string, string]> = {
  Ace: ["A fresh possibility is available. Give it one small, real first step.", "The impulse needs room to take shape. Slow the start and tend to its conditions."],
  Two: ["A choice or partnership asks for balance. Name what each path asks of you.", "Trying to hold two directions is thinning your attention. Choose a boundary."],
  Three: ["Shared effort can turn an idea into visible progress. Let another person contribute.", "Progress is uneven while roles stay unclear. Agree on the next handoff before pushing."],
  Four: ["A pause can protect what you have built. Mark what is steady before reaching further.", "Comfort may be narrowing the room. Change one routine without abandoning what works."],
  Five: ["Friction reveals what matters. Address the tension directly and keep the problem specific.", "Conflict is beginning to settle. Decide what repair is possible and what is not yours."],
  Six: ["Reciprocity matters here. Notice where help is moving in both directions.", "The exchange may be uneven. Ask for support plainly or set a fair limit."],
  Seven: ["A test of patience is underway. Check your approach before judging the outcome.", "Mixed signals make it hard to continue. Separate evidence from expectation."],
  Eight: ["Practice is carrying you forward. Keep the useful rhythm and refine one detail.", "Effort is scattered across too much. Reduce the task and finish one part."],
  Nine: ["You are closer to completion than it feels. Protect your reserves as you finish.", "Fatigue is asking for attention. Recovery is part of the work, not a reward after it."],
  Ten: ["A cycle has reached its full weight. Decide what to keep and what can be set down.", "An old obligation may outlast its purpose. Renegotiate the load before it becomes resentment."],
  Page: ["Curiosity is a good guide. Learn by trying a small version before declaring a path.", "Restlessness can masquerade as direction. Gather information before you commit."],
  Knight: ["Momentum is available. Aim it at one concrete goal and keep your pace sustainable.", "Speed is outrunning judgment. Check the impact before taking the next step."],
  Queen: ["Careful stewardship is your strength. Make room for warmth and clear standards.", "Giving without replenishing leaves little to share. Name what you need as readily as you offer help."],
  King: ["Use experience to make a grounded decision. Lead with clarity and leave room for others.", "Control can crowd out trust. Delegate one piece and let another approach work."],
}

const minorArcana: TarotCardContent[] = Object.entries(suitDomains).flatMap(([suit, domain]) =>
  Object.entries(rankReadings).map(([rank, [upright, reversed]]) => ({
    name: `${rank} of ${suit}`,
    upright: `${upright} Keep ${domain} in view as you choose your next move.`,
    reversed: `${reversed} Reconsider how ${domain} is being used in this situation.`,
    artKey: `${suit.toLowerCase()}-${rank.toLowerCase()}`,
  })),
)

const catalog = [...majors, ...minorArcana]
const contentByName = new Map(catalog.map((card) => [card.name, card]))

export function getTarotDeck(): string[] {
  return catalog.map((card) => card.name)
}

export function getTarotCardContent(name: string): TarotCardContent {
  const card = contentByName.get(name)
  if (!card) throw new Error(`Unknown tarot card: ${name}`)
  return card
}
