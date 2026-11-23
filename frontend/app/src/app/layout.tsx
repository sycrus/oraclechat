import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"

// Bundled under the OFL (fonts/OFL-*.txt) so the app renders offline (ADR-0019).
const body = localFont({ src: "./fonts/handjet-latin.woff2", weight: "300 700", variable: "--font-body", display: "swap" })
const title = localFont({ src: "./fonts/pixelify-sans-latin.woff2", weight: "400 700", variable: "--font-title", display: "swap" })

export const metadata: Metadata = {
  title: "OracleChat",
  description: "A team of fortune tellers for mindset recalibration.",
}

export const viewport: Viewport = { themeColor: "#121a3d", width: "device-width", initialScale: 1 }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${body.variable} ${title.variable}`}>
      <body>
        {children}
      </body>
    </html>
  )
}
