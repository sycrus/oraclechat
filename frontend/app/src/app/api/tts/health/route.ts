const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function GET() {
  try {
    const response = await fetch(`${backend}/api/tts/health`, { cache: "no-store" })
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json" } })
  } catch {
    return Response.json({ available: false })
  }
}
