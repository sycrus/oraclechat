const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

export async function GET() {
  return proxy("/api/conversations")
}

export async function POST(request: Request) {
  return proxy("/api/conversations", { method: "POST", body: await request.text() })
}

export async function DELETE() {
  return proxy("/api/conversations", { method: "DELETE" })
}

async function proxy(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${backend}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch {
    return Response.json({ error: "Oracle agent is unavailable" }, { status: 503 })
  }
}
