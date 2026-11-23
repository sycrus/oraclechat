import type { AspectName, Planet, Sign } from "./chart.js"

export interface AstrologyEntry {
  name: string
  meaning: string
}

export const astrologyContentProvenance = {
  names: "Traditional names of the planets, zodiac signs, houses and major aspects, as used in Western tropical astrology.",
  meanings: "Original Oracle interpretive copy, written for this project on 2026-11-23; no published astrology text or commentary copied.",
} as const

const planets: Record<Planet, AstrologyEntry> = {
  sun: { name: "Sun", meaning: "The core of who you are and what lights you up. Where you shine when you stop hiding it." },
  moon: { name: "Moon", meaning: "Your feelings, moods and what makes you feel safe. How you look after yourself when no one is watching." },
  mercury: { name: "Mercury", meaning: "How you think, talk and learn. The way you make sense of things and share them." },
  venus: { name: "Venus", meaning: "What you love, value and find beautiful. How you give and receive affection and pleasure." },
  mars: { name: "Mars", meaning: "Drive, courage and appetite for action. How you go after what you want and handle conflict." },
  jupiter: { name: "Jupiter", meaning: "Growth, luck and generosity. Where life asks you to stretch, trust and say yes." },
  saturn: { name: "Saturn", meaning: "Structure, effort and the long game. Where patience and steady work turn into something solid." },
  uranus: { name: "Uranus", meaning: "Change, surprise and independence. Where you break a pattern and try something new." },
  neptune: { name: "Neptune", meaning: "Dreams, imagination and compassion. Where lines blur, for inspiration or for fog." },
  pluto: { name: "Pluto", meaning: "Deep change and personal power. Where something ends so that something truer can begin." },
}

const signs: Record<Sign, AstrologyEntry> = {
  aries: { name: "Aries", meaning: "Direct, eager and quick to start. Brings courage and a taste for going first." },
  taurus: { name: "Taurus", meaning: "Steady, sensual and loyal. Brings patience and a love of what lasts." },
  gemini: { name: "Gemini", meaning: "Curious, chatty and adaptable. Brings ideas, connections and a light touch." },
  cancer: { name: "Cancer", meaning: "Caring, protective and feeling-led. Brings warmth and a sense of home." },
  leo: { name: "Leo", meaning: "Warm, expressive and generous. Brings heart, play and a wish to be seen." },
  virgo: { name: "Virgo", meaning: "Careful, helpful and practical. Brings skill, care and an eye for what can improve." },
  libra: { name: "Libra", meaning: "Fair, social and harmony-seeking. Brings balance, taste and a gift for partnership." },
  scorpio: { name: "Scorpio", meaning: "Intense, private and perceptive. Brings depth, focus and loyalty that runs deep." },
  sagittarius: { name: "Sagittarius", meaning: "Adventurous, frank and hopeful. Brings big-picture thinking and a love of the open road." },
  capricorn: { name: "Capricorn", meaning: "Ambitious, grounded and responsible. Brings staying power and a plan." },
  aquarius: { name: "Aquarius", meaning: "Original, independent and community-minded. Brings fresh ideas and a sense of fairness." },
  pisces: { name: "Pisces", meaning: "Gentle, intuitive and imaginative. Brings empathy, creativity and a soft heart." },
}

const houses: Record<string, AstrologyEntry> = {
  "1": { name: "First house", meaning: "Self and first impressions: how you show up and start things." },
  "2": { name: "Second house", meaning: "Money, belongings and self-worth: what you have and what you value." },
  "3": { name: "Third house", meaning: "Everyday talk, learning, siblings and neighbours: your local world." },
  "4": { name: "Fourth house", meaning: "Home, family and roots: where you come from and where you rest." },
  "5": { name: "Fifth house", meaning: "Fun, romance, creativity and children: what you make for joy." },
  "6": { name: "Sixth house", meaning: "Work routines, health and daily habits: the small things that add up." },
  "7": { name: "Seventh house", meaning: "Partners, close one-to-one bonds and agreements: who you meet as an equal." },
  "8": { name: "Eighth house", meaning: "Shared resources, intimacy and change: what you merge with others and let go of." },
  "9": { name: "Ninth house", meaning: "Travel, study, beliefs and big questions: how far your horizon reaches." },
  "10": { name: "Tenth house", meaning: "Career, reputation and public goals: what you are building out in the world." },
  "11": { name: "Eleventh house", meaning: "Friends, groups and hopes for the future: the people who share your aims." },
  "12": { name: "Twelfth house", meaning: "Rest, solitude and the inner life: what happens behind the scenes." },
}

const aspects: Record<AspectName, AstrologyEntry> = {
  conjunction: { name: "Conjunction", meaning: "Two forces fused together. They act as one, for better and for worse." },
  sextile: { name: "Sextile", meaning: "An easy opening. A friendly chance that works if you take it up." },
  square: { name: "Square", meaning: "Friction that builds strength. Two needs push against each other until you act." },
  trine: { name: "Trine", meaning: "Natural flow. A talent or ease that comes without trying." },
  opposition: { name: "Opposition", meaning: "A tug between two sides. The work is finding balance rather than picking one." },
}

export const astrologyCatalog = { planets, signs, houses, aspects } as const
