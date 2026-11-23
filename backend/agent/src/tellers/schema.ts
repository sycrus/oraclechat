import { z } from "zod"

// ── Discipline enum ────────────────────────────────────────────────────────────

export const DISCIPLINES = [
  "tarot",
  "i-ching",
  "astrology",
  "rune-casting",
  "numerology",
  "palmistry",
  "tea-leaves",
  "stoic-counsel",
] as const

export type Discipline = (typeof DISCIPLINES)[number]

// ── Relationship types ─────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = ["rapport", "friction", "mentorship"] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

// ── Signature card positions ────────────────────────────────────────────────────

export const SIGNATURE_POSITIONS = ["action", "shadow"] as const
export type SignaturePosition = (typeof SIGNATURE_POSITIONS)[number]

// ── Gender ─────────────────────────────────────────────────────────────────────

export const GENDERS = ["male", "female", "non-binary"] as const
export type Gender = (typeof GENDERS)[number]

// ── Schema ─────────────────────────────────────────────────────────────────────

export const tellerDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "Must be kebab-case (lowercase letters, digits, hyphens)"),
  displayName: z.string().min(1),
  avatar: z.string().min(1),
  discipline: z.enum(DISCIPLINES),
  gender: z.enum(GENDERS),
  personality: z.object({
    voice: z.string().min(1),
    humor: z.string().min(1),
    emotionalRegister: z.string().min(1),
    reframingStyle: z.string().min(1),
  }),
  lifeContext: z.array(z.string()).optional(),
  activationProfile: z.object({
    topics: z.array(z.string()).min(1),
    emotionalTones: z.array(z.string()).min(1),
    situations: z.array(z.string()).min(1),
  }),
  relationships: z
    .array(
      z.object({
        targetTellerId: z.string(),
        type: z.enum(RELATIONSHIP_TYPES),
      })
    )
    .optional(),
  /** How the teller reads in its own discipline. */
  readingLens: z.string().min(1),
  /** Tarot tellers only: the extra card drawn for them with each tarot reading. */
  signatureCard: z.object({
    position: z.enum(SIGNATURE_POSITIONS),
  }).optional(),
  /** Tarot tellers only: give chat readings as a fan of face-down cards the user picks from (ADR-0017); the invitation is shown with it. */
  fan: z.object({ invitation: z.string().min(1) }).optional(),
  /** I Ching tellers only: give chat readings as an interactive coin toss the user performs (ADR-0017); the invitation is shown with it. */
  toss: z.object({ invitation: z.string().min(1) }).optional(),
  /** Astrology tellers only, and required for them: shown with the birth-details form when no birth details are saved (ADR-0018). */
  birthDetails: z.object({ invitation: z.string().min(1) }).optional(),
  systemPrompt: z.string().min(1),
  /** Video calls: the named voice reference clip in the speech service's voices folder. */
  call: z.object({
    voice: z.string().regex(/^[a-z0-9-]+$/, "Must be a voice name (lowercase letters, digits, hyphens)"),
  }).optional(),
}).superRefine((teller, context) => {
  if (teller.discipline === "tarot" && !teller.signatureCard) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["signatureCard"], message: "Tarot tellers need a signature card" })
  }
  if (teller.discipline !== "tarot" && teller.signatureCard) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["signatureCard"], message: "Only tarot tellers have a signature card" })
  }
  if (teller.discipline !== "tarot" && teller.fan) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fan"], message: "Only tarot tellers have a card fan" })
  }
  if (teller.discipline !== "i-ching" && teller.toss) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["toss"], message: "Only I Ching tellers have a coin toss" })
  }
  if (teller.discipline === "astrology" && !teller.birthDetails) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["birthDetails"], message: "Astrology tellers need a birth-details invitation" })
  }
  if (teller.discipline !== "astrology" && teller.birthDetails) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["birthDetails"], message: "Only astrology tellers have a birth-details invitation" })
  }
})

export type TellerDefinition = z.infer<typeof tellerDefinitionSchema>
