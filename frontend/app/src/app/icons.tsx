import React from "react"

/** OracleChat's pixel icons (ADR-0019): each drawn on a 16×16 grid; `evenodd` marks icons with holes. */
export const ICONS = {
  search: { d: "M5 2h4v1H5zM4 3h1v1H4zM9 3h1v1H9zM3 4h1v4H3zM10 4h1v4h-1zM4 8h1v1H4zM9 8h1v1H9zM5 9h4v1H5zM10 10h2v2h-2zM12 12h2v2h-2z" },
  camera: { d: "M5 3h4v2H5zM2 5h12v8H2zM6 7h4v4H6zM7 8h2v2H7z", evenodd: true },
  more: { d: "M7 2h2v2H7zM7 7h2v2H7zM7 12h2v2H7z" },
  back: { d: "M2 7h12v2H2zM4 5h2v2H4zM6 3h2v2H6zM4 9h2v2H4zM6 11h2v2H6z" },
  arrow: { d: "M2 7h12v2H2zM10 5h2v2h-2zM8 3h2v2H8zM10 9h2v2h-2zM8 11h2v2H8z" },
  chats: { d: "M2 2h12v9H7v1H6v1H5v1H4v-3H2z" },
  user: { d: "M6 2h4v1H6zM5 3h6v4H5zM6 7h4v1H6zM4 10h8v1H4zM3 11h10v4H3z" },
  group: { d: "M4 2h3v1H4zM3 3h5v3H3zM4 6h3v1H4zM10 3h3v1h-3zM9 4h5v3H9zM10 7h3v1h-3zM1 9h8v1H1zM1 10h8v4H1zM10 10h5v1h-5zM10 11h5v3h-5z" },
  newchat: { d: "M1 1h14v1H1zM1 2h1v11H1zM14 2h1v11h-1zM6 12h8v1H6zM4 12h2v1H4zM2 13h2v1H2zM2 14h1v1H2zM7 4h2v6H7zM5 6h6v2H5z" },
  phone: { d: "M2 2h4v4H2zM3 6h2v2H3zM4 8h2v2H4zM6 9h2v2H6zM8 10h2v2H8zM10 10h4v4h-4z" },
  video: { d: "M1 4h10v8H1zM11 7h1v2h-1zM12 6h1v4h-1zM13 5h2v6h-2z" },
  ticks: { d: "M1 8h1v1H1zM2 9h1v1H2zM3 10h1v1H3zM4 9h1v1H4zM5 8h1v1H5zM6 7h1v1H6zM7 6h1v1H7zM8 5h1v1H8zM7 10h1v1H7zM8 9h1v1H8zM9 8h1v1H9zM10 7h1v1h-1zM11 6h1v1h-1zM12 5h1v1h-1zM13 4h1v1h-1z" },
  tick: { d: "M2 8h2v2H2zM4 10h2v2H4zM6 8h2v2H6zM8 6h2v2H8zM10 4h2v2h-2zM12 2h2v2h-2z" },
  send: { d: "M2 2h2v12H2zM4 3h2v10H4zM6 4h2v8H6zM8 5h2v6H8zM10 6h2v4h-2zM12 7h2v2h-2z" },
  mic: { d: "M6 1h4v1H6zM5 2h6v6H5zM6 8h4v1H6zM3 6h1v3H3zM12 6h1v3h-1zM4 9h1v1H4zM11 9h1v1h-1zM5 10h6v1H5zM7 11h2v3H7zM5 14h6v1H5z" },
  mute: { d: "M6 1h4v1H6zM5 2h6v6H5zM6 8h4v1H6zM3 6h1v3H3zM12 6h1v3h-1zM4 9h1v1H4zM11 9h1v1h-1zM5 10h6v1H5zM7 11h2v3H7zM5 14h6v1H5zM1 1h2v2H1zM3 3h2v2H3zM13 13h2v2h-2z" },
  end: { d: "M1 6h14v3H1zM1 9h3v2H1zM12 9h3v2h-3z" },
  lock: { d: "M5 2h6v1H5zM4 3h1v4H4zM11 3h1v4h-1zM3 7h10v8H3zM7 9h2v3H7z", evenodd: true },
  close: { d: "M3 3h2v2H3zM5 5h2v2H5zM7 7h2v2H7zM9 9h2v2H9zM11 11h2v2h-2zM11 3h2v2h-2zM9 5h2v2H9zM5 9h2v2H5zM3 11h2v2H3z" },
  list: { d: "M1 2h2v2H1zM5 2h10v2H5zM1 7h2v2H1zM5 7h10v2H5zM1 12h2v2H1zM5 12h10v2H5z" },
  coin: { d: "M5 1h6v1H5zM3 2h10v1H3zM2 3h12v2H2zM1 5h14v6H1zM2 11h12v2H2zM3 13h10v1H3zM5 14h6v1H5zM6 6h4v4H6z", evenodd: true },
  form: { d: "M2 1h12v14H2zM4 4h8v1H4zM4 7h8v1H4zM4 10h5v1H4z", evenodd: true },
  expand: { d: "M1 1h6v2H3v4H1zM9 1h6v6h-2V3H9zM1 9h2v4h4v2H1zM13 9h2v6H9v-2h4z" },
  edit: { d: "M11 1h2v1h1v1h1v2h-1v1h-1v1h-1V6h-1V5h-1V4H9V3h1V2h1zM8 4h1v1h1v1h1v1h1v1h-1v1h-1v1H9v1H8v1H7v1H6v1H5v1H1v-4h1v-1h1V9h1V8h1V7h1V6h1V5h1z" },
  calendar: { d: "M4 1h2v2H4zM10 1h2v2h-2zM1 3h14v12H1zM3 7h10v6H3zM4 8h2v2H4zM7 8h2v2H7z", evenodd: true },
  clock: { d: "M5 1h6v1H5zM3 2h2v1H3zM11 2h2v1h-2zM2 3h1v2H2zM13 3h1v2h-1zM1 5h1v6H1zM14 5h1v6h-1zM2 11h1v2H2zM13 11h1v2h-1zM3 13h2v1H3zM11 13h2v1h-2zM5 14h6v1H5zM7 4h2v5H7zM9 7h3v2H9z" },
  trash: { d: "M6 1h4v1H6zM2 2h12v2H2zM3 5h10v10H3zM5 7h1v6H5zM10 7h1v6h-1zM7 7h2v6H7z", evenodd: true },
  pin: { d: "M6 1h4v1H6zM5 2h6v5H5zM3 7h10v2H3zM7 9h2v6H7z" },
  mira: { d: "M4 2h8v1H4zM4 13h8v1H4zM4 3h1v10H4zM11 3h1v10h-1zM7 5h2v1H7zM6 6h4v1H6zM5 7h6v2H5zM6 9h4v1H6zM7 10h2v1H7z" },
  sage: { d: "M3 3h10v1H3zM3 5h4v1H3zM9 5h4v1H9zM3 7h10v1H3zM3 9h10v1H3zM3 11h4v1H3zM9 11h4v1H9zM3 13h10v1H3z" },
  astra: { d: "M7 2h2v3H7zM6 5h4v2H6zM2 7h12v2H2zM6 9h4v2H6zM7 11h2v3H7zM12 3h1v1h-1zM3 12h1v1H3z" },
} satisfies Record<string, { d: string; evenodd?: boolean }>

export type IconName = keyof typeof ICONS

/** A pixel icon in the current text colour. Sizes are 16, 24 or 32 so pixels stay whole on 2× screens. */
export function Icon({ name, size = 24, className }: { name: IconName; size?: 16 | 24 | 32 | 48 | 96; className?: string }) {
  const icon: { d: string; evenodd?: boolean } = ICONS[name]
  return <svg className={className} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" {...(icon.evenodd ? { fillRule: "evenodd" as const } : {})}><path d={icon.d} /></svg>
}
