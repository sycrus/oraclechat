const backend = process.env.ORACLE_AGENT_URL ?? "http://127.0.0.1:4000"

/** Forwards a spoken turn (WAV) to the backend for local transcription (ADR-0016). */
export async function POST(request: Request) {
  try {
    const response = await fetch(`${backend}/api/stt`, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: await request.arrayBuffer(),
    })
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } })
  } catch {
    return Response.json({ error: "speech recognition offline" }, { status: 503 })
  }
}
