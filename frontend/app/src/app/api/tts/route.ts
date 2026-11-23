const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function POST(request: Request) {
  try {
    const response = await fetch(`${backend}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    })
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } })
  } catch {
    return Response.json({ error: "voice offline" }, { status: 503 })
  }
}
