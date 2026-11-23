/**
 * Pixel tarot faces for the call's card strip (voice-calls: Readings during a call): 24×36 cards in call palette
 * colours, one character per pixel. Major arcana are dark cards with one recognisable symbol each; number cards
 * show their count of suit symbols; court cards show a large suit symbol under a crown, helmet or cap.
 */
import type { ProfileArt } from "./profile-art"

const COLOURS = { n: "#0b1028", r: "#1c2752", l: "#2a3768", m: "#2d4a8c", u: "#8c93b0", g: "#d4d8e4", w: "#f0f2f8", a: "#e8c35a", s: "#f0c9a6", t: "#c98e66", b: "#7a4e3c", v: "#4a3366", i: "#6b55b0", e: "#b4434a", f: "#3f7a6a" } as const
type Colour = keyof typeof COLOURS

const W = 24
const H = 36

class Grid {
  readonly px: (Colour | null)[][] = Array.from({ length: H }, () => Array<Colour | null>(W).fill(null))
  set(x: number, y: number, c: Colour) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) this.px[y]![x] = c }
  rect(x: number, y: number, w: number, h: number, c: Colour) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c) }
  disc(cx: number, cy: number, r: number, c: Colour) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) this.set(x, y, c) }
  ring(cx: number, cy: number, r: number, c: Colour) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > r - 1.2) this.set(x, y, c) } }
  line(x0: number, y0: number, x1: number, y1: number, c: Colour) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) this.set(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c) }
  pts(list: [number, number][], c: Colour) { for (const [x, y] of list) this.set(x, y, c) }
  rows() { return this.px.map((row) => row.map((c) => c ?? ".").join("")) }
}

function frame(g: Grid, paper: Colour, edge: Colour, trim: Colour) {
  g.rect(0, 0, W, H, edge)
  g.rect(1, 1, W - 2, H - 2, paper)
  g.rect(2, 2, W - 4, 1, trim); g.rect(2, H - 3, W - 4, 1, trim); g.rect(2, 2, 1, H - 4, trim); g.rect(W - 3, 2, 1, H - 4, trim)
}

/** The 22 major arcana symbols, drawn on a night card around (12, 18). */
const MAJORS: ((g: Grid) => void)[] = [
  (g) => { g.line(6, 26, 15, 11, "t"); g.disc(16, 10, 2.6, "e"); g.disc(7, 9, 2.2, "a"); g.rect(4, 27, 16, 1, "f") }, // The Fool: bindle and sun
  (g) => { g.ring(9, 11, 3, "a"); g.ring(15, 11, 3, "a"); g.rect(11, 15, 2, 12, "w"); g.rect(11, 15, 2, 1, "a"); g.rect(11, 26, 2, 1, "a") }, // The Magician: infinity and wand
  (g) => { g.rect(5, 12, 3, 15, "w"); g.rect(16, 12, 3, 15, "l"); g.rect(16, 12, 3, 1, "g"); g.disc(12, 9, 3.5, "a"); g.disc(13.5, 8, 3, "n") }, // The High Priestess: pillars and moon
  (g) => { g.ring(12, 12, 4.5, "a"); g.ring(12, 12, 3.6, "a"); g.rect(11, 16, 2, 10, "a"); g.rect(8, 20, 8, 2, "a") }, // The Empress: Venus
  (g) => { g.rect(7, 11, 10, 9, "e"); g.rect(5, 19, 14, 3, "e"); g.rect(6, 22, 2, 5, "e"); g.rect(16, 22, 2, 5, "e"); g.rect(8, 8, 8, 2, "a"); g.pts([[8, 7], [12, 6], [15, 7]], "a") }, // The Emperor: throne and crown
  (g) => { g.line(6, 26, 17, 10, "a"); g.line(17, 26, 6, 10, "a"); g.ring(6, 9, 2.4, "a"); g.ring(17, 9, 2.4, "a"); g.rect(7, 25, 2, 2, "a"); g.rect(15, 25, 2, 2, "a") }, // The Hierophant: crossed keys
  (g) => { g.disc(9, 14, 3.4, "e"); g.disc(15, 14, 3.4, "e"); for (let k = 0; k < 8; k++) g.rect(5 + k, 15 + k, 14 - 2 * k, 1, "e") }, // The Lovers: heart
  (g) => { g.rect(5, 11, 14, 2, "i"); g.rect(6, 13, 12, 7, "m"); g.pts([[12, 15], [11, 16], [12, 16], [13, 16], [12, 17]], "a"); g.ring(8, 23, 3, "g"); g.ring(16, 23, 3, "g") }, // The Chariot
  (g) => { g.disc(12, 17, 7.5, "b"); g.disc(12, 18, 4.6, "a"); g.pts([[10, 17], [14, 17]], "n"); g.rect(11, 19, 2, 1, "b"); g.pts([[11, 21], [13, 21]], "b") }, // Strength: lion
  (g) => { g.rect(12, 7, 1, 2, "g"); g.rect(9, 9, 7, 2, "g"); g.rect(9, 11, 7, 9, "a"); g.rect(9, 11, 1, 9, "g"); g.rect(15, 11, 1, 9, "g"); g.rect(11, 13, 3, 5, "w"); g.rect(9, 20, 7, 2, "g"); g.rect(19, 7, 1, 21, "t") }, // The Hermit: lantern and staff
  (g) => { g.ring(12, 18, 8, "a"); g.ring(12, 18, 7, "a"); g.line(12, 11, 12, 25, "a"); g.line(5, 18, 19, 18, "a"); g.line(7, 13, 17, 23, "a"); g.line(17, 13, 7, 23, "a"); g.disc(12, 18, 2, "w") }, // Wheel of Fortune
  (g) => { g.rect(11, 8, 2, 19, "g"); g.rect(4, 10, 16, 1, "g"); g.line(5, 11, 3, 17, "g"); g.line(5, 11, 7, 17, "g"); g.line(18, 11, 16, 17, "g"); g.line(18, 11, 20, 17, "g"); g.rect(2, 17, 7, 2, "a"); g.rect(15, 17, 7, 2, "a"); g.rect(8, 26, 8, 2, "g") }, // Justice: scales
  (g) => { g.rect(4, 7, 16, 2, "t"); g.rect(12, 9, 1, 2, "g"); g.rect(11, 11, 1, 5, "m"); g.rect(13, 11, 1, 3, "m"); g.rect(10, 16, 5, 6, "m"); g.ring(12, 25, 3.6, "a"); g.disc(12, 25, 2.2, "s") }, // The Hanged Man
  (g) => { g.disc(12, 16, 6.5, "w"); g.rect(9, 21, 7, 4, "w"); g.rect(8, 14, 3, 3, "n"); g.rect(14, 14, 3, 3, "n"); g.rect(12, 18, 1, 2, "n"); g.pts([[10, 23], [12, 23], [14, 23]], "n") }, // Death: skull
  (g) => { g.rect(4, 9, 6, 6, "a"); g.rect(5, 15, 4, 1, "a"); g.rect(14, 20, 6, 6, "a"); g.rect(15, 26, 4, 1, "a"); g.line(9, 11, 15, 20, "m"); g.line(10, 11, 16, 20, "w") }, // Temperance: two cups pouring
  (g) => { g.disc(12, 19, 5.5, "e"); g.line(8, 15, 5, 8, "g"); g.line(9, 15, 6, 8, "g"); g.line(16, 15, 19, 8, "g"); g.line(15, 15, 18, 8, "g"); g.pts([[10, 18], [14, 18]], "a"); g.rect(10, 21, 5, 1, "n") }, // The Devil: horns
  (g) => { g.rect(8, 13, 8, 15, "u"); g.pts([[8, 12], [10, 12], [13, 12], [15, 12]], "u"); g.rect(11, 17, 2, 3, "a"); g.rect(11, 23, 2, 5, "n"); g.line(19, 4, 15, 9, "a"); g.line(15, 9, 18, 10, "a"); g.line(18, 10, 13, 15, "a"); g.pts([[9, 10], [14, 10], [10, 9]], "e") }, // The Tower: lightning
  (g) => { g.line(12, 7, 12, 23, "a"); g.line(5, 15, 19, 15, "a"); for (let k = 0; k < 3; k++) g.rect(12 - 2 + k, 15 - k, 5 - 2 * k, 1 + 2 * k, "a"); g.rect(10, 13, 5, 5, "a"); g.set(12, 15, "w"); g.pts([[5, 8], [19, 8], [6, 21], [18, 21], [4, 14], [20, 14]], "w"); g.pts([[4, 7], [5, 7], [6, 7], [5, 6], [19, 7], [18, 7], [20, 7], [19, 6]], "w"); g.rect(4, 27, 4, 1, "m"); g.rect(10, 28, 4, 1, "m"); g.rect(16, 27, 4, 1, "m"); g.rect(6, 29, 3, 1, "m"); g.rect(15, 29, 3, 1, "m") }, // The Star: one bright star over water
  (g) => { g.disc(12, 15, 6.5, "a"); g.disc(15, 13, 6, "n"); g.pts([[18, 8], [19, 20], [5, 9]], "w"); g.rect(4, 26, 3, 1, "m"); g.rect(9, 27, 4, 1, "m"); g.rect(16, 26, 4, 1, "m") }, // The Moon
  (g) => { g.disc(12, 18, 5, "a"); g.line(12, 8, 12, 28, "a"); g.line(2, 18, 22, 18, "a"); g.line(5, 11, 19, 25, "a"); g.line(19, 11, 5, 25, "a"); g.disc(12, 18, 3.6, "a"); g.pts([[11, 17], [13, 17]], "e") }, // The Sun
  (g) => { g.line(5, 26, 15, 12, "a"); g.line(6, 26, 16, 12, "a"); g.rect(14, 9, 5, 4, "a"); g.rect(16, 10, 5, 2, "a"); g.rect(7, 18, 4, 3, "e"); g.rect(8, 17, 2, 5, "w"); g.pts([[19, 21], [20, 22], [18, 22], [21, 23]], "g") }, // Judgement: trumpet and banner
  (g) => { for (let k = 0; k < 360; k += 4) { const a = k * Math.PI / 180; g.set(12 + Math.cos(a) * 6 - .5, 18 + Math.sin(a) * 9 - .5, "f"); g.set(12 + Math.cos(a) * 5.3 - .5, 18 + Math.sin(a) * 8.2 - .5, "f") } g.disc(12, 18, 2.2, "a"); g.pts([[12, 8], [12, 28]], "e") }, // The World: wreath
]

const SUIT: Record<string, { paper: Colour; trim: Colour; glyph: (g: Grid, x: number, y: number, scale?: number) => void }> = {
  wands: { paper: "w", trim: "e", glyph: (g, x, y, s = 1) => { for (let k = 0; k < 5 * s; k++) g.rect(x + 4 * s - k, y + k, 1, 1, "b"); g.rect(x + 4 * s - 1, y, s, s, "f"); g.rect(x + 4 * s, y + s, s, s, "f") } },
  cups: { paper: "w", trim: "m", glyph: (g, x, y, s = 1) => { g.rect(x, y, 5 * s, 2 * s, "m"); g.rect(x + s, y + 2 * s, 3 * s, s, "m"); g.rect(x + 2 * s, y + 3 * s, s, s, "m"); g.rect(x + s, y + 4 * s, 3 * s, s, "m") } },
  swords: { paper: "w", trim: "l", glyph: (g, x, y, s = 1) => { g.rect(x + 2 * s, y, s, 3 * s, "u"); g.rect(x, y + 3 * s, 5 * s, s, "b"); g.rect(x + 2 * s, y + 4 * s, s, s, "l") } },
  pentacles: { paper: "w", trim: "f", glyph: (g, x, y, s = 1) => { g.rect(x + s, y, 3 * s, 5 * s, "b"); g.rect(x, y + s, 5 * s, 3 * s, "b"); g.rect(x + s, y + s, 3 * s, 3 * s, "a"); g.rect(x + 2 * s, y + 2 * s, s, s, "b") } },
}

const RANKS = ["ace", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]

/** Where `count` 5×5 suit symbols sit in the card's middle. */
function pipSpots(count: number): [number, number][] {
  const columns = count <= 3 ? 1 : count <= 6 ? 2 : 3
  const rows = Math.ceil(count / columns)
  const spots: [number, number][] = []
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns)
    const inRow = Math.min(columns, count - row * columns)
    const column = index % columns
    spots.push([Math.round(12 - 2.5 + (column - (inRow - 1) / 2) * 6), Math.round(18 - 2.5 + (row - (rows - 1) / 2) * 6.5)])
  }
  return spots
}

const COURTS: Record<string, (g: Grid) => void> = {
  page: (g) => { g.disc(12, 11, 3, "i"); g.rect(8, 11, 9, 2, "i"); g.line(15, 9, 18, 5, "e") }, // a cap with a feather
  knight: (g) => { g.rect(8, 6, 8, 8, "u"); g.rect(9, 9, 6, 1, "n"); g.rect(11, 4, 2, 2, "e") }, // a helmet with a plume
  queen: (g) => { g.rect(7, 10, 10, 3, "a"); g.pts([[7, 9], [9, 8], [12, 7], [15, 8], [17, 9]], "a"); g.set(12, 11, "e") }, // a rounded crown
  king: (g) => { g.rect(7, 10, 10, 3, "a"); g.rect(7, 7, 2, 3, "a"); g.rect(11, 6, 2, 4, "a"); g.rect(15, 7, 2, 3, "a"); g.set(12, 11, "m") }, // a pointed crown
}

export function pixelTarot(artKey: string): ProfileArt {
  const g = new Grid()
  const [family = "", rank = ""] = artKey.split("-")
  const suit = SUIT[family]
  if (family === "major" && MAJORS[Number(rank)]) {
    frame(g, "n", "a", "v")
    MAJORS[Number(rank)]!(g)
  } else if (suit && RANKS.includes(rank)) {
    frame(g, suit.paper, "n", suit.trim)
    const count = RANKS.indexOf(rank) + 1
    if (count === 1) suit.glyph(g, 7, 13, 2)
    else for (const [x, y] of pipSpots(count)) suit.glyph(g, x, y)
  } else if (suit && COURTS[rank]) {
    frame(g, suit.paper, "n", suit.trim)
    COURTS[rank]!(g)
    suit.glyph(g, 7, 17, 2)
  } else {
    frame(g, "m", "n", "a")
    g.disc(12, 18, 3, "a")
  }
  return { rows: g.rows(), colours: COLOURS }
}
