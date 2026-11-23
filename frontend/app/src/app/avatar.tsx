import React from "react"
import { PROFILE_ART } from "../lib/profile-art"
import { PixelGrid } from "./pixel-grid"
import { Icon, type IconName } from "./icons"

const SPRITES: Record<string, { icon: IconName; tone: number }> = {
  "mira-the-mystic": { icon: "mira", tone: 0 },
  "sage-the-seer": { icon: "sage", tone: 1 },
  "astra-the-astrologer": { icon: "astra", tone: 2 },
}

/** A teller's avatar on a stepped circle: their profile picture, or a pixel icon when they have none. */
export function TellerAvatar({ tellerId, size = 52 }: { tellerId: string; size?: 40 | 52 | 160 }) {
  const art = PROFILE_ART[tellerId]
  if (art) return <span className={`avatar avatar-art avatar-${size}`} aria-hidden="true"><PixelGrid art={art} /></span>
  const sprite = SPRITES[tellerId] ?? { icon: "user" as const, tone: 0 }
  return <span className={`avatar avatar-${sprite.tone} avatar-${size}`} aria-hidden="true"><Icon name={sprite.icon} size={size === 160 ? 96 : size === 40 ? 24 : 32} /></span>
}

/** One avatar for a one-to-one chat, two overlapping for a group. */
export function ConversationAvatar({ tellerIds, size = 52 }: { tellerIds: string[]; size?: 40 | 52 }) {
  if (tellerIds.length < 2) return <TellerAvatar tellerId={tellerIds[0] ?? ""} size={size} />
  return <span className={`avatar-group avatar-group-${size}`} aria-hidden="true">
    {tellerIds.slice(0, 2).map((id) => <TellerAvatar key={id} tellerId={id} size={40} />)}
  </span>
}
