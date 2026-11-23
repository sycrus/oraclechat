const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? ""
    const response = await fetch(`${backend}/api/places?q=${encodeURIComponent(query)}`, { cache: "no-store" })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
