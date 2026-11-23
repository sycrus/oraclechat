const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function GET() {
  try {
    const response = await fetch(`${backend}/api/memory`, { cache: "no-store" })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
