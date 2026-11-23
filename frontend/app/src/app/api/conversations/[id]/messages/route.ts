const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${backend}/api/conversations/${encodeURIComponent(params.id)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: await request.text(),
      cache: "no-store",
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
