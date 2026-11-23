const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${backend}/api/memory/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${backend}/api/memory/${encodeURIComponent(params.id)}`, { method: "DELETE" })
    return new Response(null, { status: response.status })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
