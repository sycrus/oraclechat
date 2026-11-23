import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js"

/**
 * `next dev` builds into `.next-dev` so it never overwrites the production build in `.next`,
 * which the supervised `next start` serves (ADR-0010).
 * @type {(phase: string) => import('next').NextConfig}
 */
const nextConfig = (phase) => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
})

export default nextConfig
