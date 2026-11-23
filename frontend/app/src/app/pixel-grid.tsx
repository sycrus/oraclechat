import React from "react"
import type { ProfileArt } from "../lib/profile-art"

/** Pixel art from one-character-per-pixel rows, drawn as square-edged runs of colour (one rect per run). */
export function PixelGrid({ art, label, className }: { art: ProfileArt; label?: string; className?: string }) {
  const width = art.rows[0]?.length ?? 0
  const runs: React.ReactNode[] = []
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const key = row[x]!
      let end = x + 1
      while (row[end] === key) end += 1
      if (key !== ".") runs.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={art.colours[key]} />)
      x = end
    }
  })
  return <svg className={className} viewBox={`0 0 ${width} ${art.rows.length}`} shapeRendering="crispEdges" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>{runs}</svg>
}
