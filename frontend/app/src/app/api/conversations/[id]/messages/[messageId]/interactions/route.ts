const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

// Picks answer with JSON; a reveal streams the teller's interpretation as server-sent events (ADR-0017).
export async function POST(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const response = await fetch(`${backend}/api/conversations/${encodeURIComponent(params.id)}/messages/${encodeURIComponent(params.messageId)}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: await request.text(),
      cache: "no-store",
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
