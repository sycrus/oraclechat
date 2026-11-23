const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function PUT(request: Request) {
  try {
    const response = await fetch(`${backend}/api/memory/hosted-consent`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
