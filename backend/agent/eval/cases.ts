/** The 24 cases of the teller model comparison eval (openspec add-teller-model-eval). */
export const MIRA = "mira-the-mystic"
export const SAGE = "sage-the-seer"
export const ASTRA = "astra-the-astrologer"

export interface EvalCase {
  id: string
  tellers: string[]
  /** User messages, sent in order; checks run on every reply, the right-teller check on the last turn. */
  turns: string[]
  /** Pair chats: who should give a reading on the last turn; "one" means exactly one teller, either. */
  expectReaders?: string[] | "one"
}

export const CASES: EvalCase[] = [
  // Mira alone (tarot)
  { id: "mira-three-card", tellers: [MIRA], turns: ["I'm stuck between staying at my job and going freelance. Can you do a three-card reading for me?"] },
  { id: "mira-one-card", tellers: [MIRA], turns: ["Pull one card for me about my week."] },
  { id: "mira-celtic-cross", tellers: [MIRA], turns: ["Mira, I want the full Celtic Cross on whether I should move cities."] },
  { id: "mira-small-talk", tellers: [MIRA], turns: ["How's the lemon balm doing?"] },
  { id: "mira-feelings", tellers: [MIRA], turns: ["I bombed my interview today and feel like an idiot."] },
  { id: "mira-follow-up", tellers: [MIRA], turns: ["Read three cards for me about my creative block.", "Which of those cards should I focus on first?"] },
  // Sage alone (I Ching)
  { id: "sage-cast", tellers: [SAGE], turns: ["Sage, cast the coins for me: should I take the slow path with my studies?"] },
  { id: "sage-unnamed-reading", tellers: [SAGE], turns: ["Can I get a reading about my relationship with my brother?"] },
  { id: "sage-small-talk", tellers: [SAGE], turns: ["What's your favourite tea, Sage?"] },
  { id: "sage-advice", tellers: [SAGE], turns: ["My friend keeps cancelling plans on me. What would you do?"] },
  { id: "sage-follow-up", tellers: [SAGE], turns: ["Cast for me about starting a business.", "What should I take from that hexagram this week?"] },
  // Astra alone (astrology, birth details already saved)
  { id: "astra-transits", tellers: [ASTRA], turns: ["What are my transits doing right now?"] },
  { id: "astra-raise", tellers: [ASTRA], turns: ["Look at my chart: is this a good time to ask for a raise?"] },
  { id: "astra-small-talk", tellers: [ASTRA], turns: ["Astra, what got you into astrology?"] },
  { id: "astra-feelings", tellers: [ASTRA], turns: ["I keep doubting myself at work."] },
  { id: "astra-follow-up", tellers: [ASTRA], turns: ["Read my chart for me.", "What does that mean for my love life?"] },
  // Pairs
  { id: "pair-mira-named", tellers: [MIRA, SAGE], turns: ["Mira, pull a card for me about my job hunt."], expectReaders: [MIRA] },
  { id: "pair-sage-named", tellers: [MIRA, SAGE], turns: ["Sage, can you cast for me about my move?"], expectReaders: [SAGE] },
  { id: "pair-both-read", tellers: [MIRA, SAGE], turns: ["Could you both do a reading for me about my new relationship?"], expectReaders: [MIRA, SAGE] },
  { id: "pair-unnamed", tellers: [MIRA, SAGE], turns: ["Could someone read for me about my sister's wedding?"], expectReaders: "one" },
  { id: "pair-small-talk", tellers: [MIRA, SAGE], turns: ["Mira, how's the war with your neighbour's wind chimes going?"], expectReaders: [] },
  { id: "pair-astra-named", tellers: [MIRA, ASTRA], turns: ["Astra, what are my transits saying about this month?"], expectReaders: [ASTRA] },
  { id: "pair-each-read", tellers: [SAGE, ASTRA], turns: ["Can you two each give me a reading on my career?"], expectReaders: [SAGE, ASTRA] },
  { id: "pair-feelings", tellers: [MIRA, ASTRA], turns: ["I'm nervous about tomorrow's presentation."], expectReaders: [] },
]
