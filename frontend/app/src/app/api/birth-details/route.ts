const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function GET() {
  try {
    const response = await fetch(`${backend}/api/birth-details`, { cache: "no-store" })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}

export async function PUT(request: Request) {
  try {
    const response = await fetch(`${backend}/api/birth-details`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: await request.text() })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}

export async function DELETE() {
  try {
    const response = await fetch(`${backend}/api/birth-details`, { method: "DELETE" })
    return new Response(null, { status: response.status })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
