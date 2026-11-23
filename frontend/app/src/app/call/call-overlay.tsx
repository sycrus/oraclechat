"use client"

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { readEvents } from "../../lib/call/events"
import { callPanel } from "../../lib/call/reading"
import type { Place } from "../../lib/birth-form"
import type { InteractionAction } from "../chat-view"
import { CallPanel } from "./call-panel"
import { callReducer, initialCallState, validateSentence, type Expression } from "../../lib/call/state"
import { createTurnDetector, type TurnDetector, type TurnEvent } from "../../lib/call/vad"
import { downsample, encodeWav } from "../../lib/call/wav"
import { CallOverlayView } from "./call-overlay-view"
import type { LipSyncReading, VrmStage } from "./vrm-stage"

type LipSyncNode = AudioNode & LipSyncReading

/** Vowel lip sync for this audio context, or null (loudness only) if it can't start, e.g. no AudioWorklet outside a secure context. */
async function startLipSync(context: AudioContext): Promise<LipSyncNode | null> {
  try {
    const [{ createWLipSyncNode }, profile] = await Promise.all([
      import("wlipsync"),
      fetch("/lipsync/profile.json").then((response) => { if (!response.ok) throw new Error(`profile HTTP ${response.status}`); return response.json() }),
    ])
    return await createWLipSyncNode(context, profile)
  } catch (cause) {
    if (context.state !== "closed") console.warn("[call] vowel lip sync unavailable; mouth follows loudness", cause)
    return null
  }
}

interface CallOverlayProps {
  teller: { id: string; name: string; model: string }
  conversationId: string
  /** "chat" sends messages to the conversation; "say" (?say=1) speaks the typed text verbatim. */
  mode: "chat" | "say"
  onEnd: () => void
  /** A call turn finished: the conversation has new messages. */
  onTurnComplete: () => void
  /** Place search for the birth-details form (ADR-0018). */
  searchPlaces: (query: string) => Promise<Place[]>
}

/** A saved message as the call's events carry it. */
type CallMessage = { id: string; interaction?: unknown; reading?: unknown; signatureCard?: unknown }

/** Subtitle-only pacing when the voice is offline. */
const subtitleMs = (text: string) => Math.max(1500, text.length * 60)
const CANT_HEAR = "Can't hear you right now — type instead"

export function CallOverlay({ teller, conversationId, mode, onEnd, onTurnComplete, searchPlaces }: CallOverlayProps) {
  const [state, dispatch] = useReducer(callReducer, initialCallState)
  const [voice, setVoice] = useState<"checking" | "online" | "offline">("checking")
  const [model, setModel] = useState<"loading" | "ready" | "failed">("loading")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  // The latest reading or interactive message from this call's turns, shown in the message panel (ADR-0020).
  const [reading, setReading] = useState<CallMessage | null>(null)
  const [turnInFlight, setTurnInFlight] = useState(false)
  const [mic, setMic] = useState<"on" | "muted" | "blocked">()
  const [listening, setListening] = useState<"ok" | "offline">()
  const [hearing, setHearing] = useState(false)
  const [ownerCaption, setOwnerCaption] = useState("")
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<VrmStage | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const lipSync = useRef<Promise<LipSyncNode | null> | null>(null)
  const playing = useRef(false)
  const playingSource = useRef<AudioBufferSourceNode | null>(null)
  // Bumped on every interrupt, so speech fetched for the interrupted turn is never started.
  const generation = useRef(0)
  const stateNow = useRef(state)
  stateNow.current = state
  const inFlight = useRef(false)
  const pendingTalk = useRef<string | null>(null)
  const micStream = useRef<MediaStream | null>(null)
  const detector = useRef<TurnDetector | null>(null)
  const micOn = useRef(false)
  const onTurnEvent = useRef<(event: TurnEvent, sampleRate: number) => void>(() => undefined)
  // Speech is requested as each sentence arrives, so the next one is ready when the current one ends.
  const prefetched = useRef(new Map<string, Promise<Response>>())
  const requestSpeech = useCallback((text: string) => {
    const pending = prefetched.current.get(text) ?? fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerId: teller.id, text }) })
    prefetched.current.set(text, pending)
    return pending
  }, [teller.id])

  /** The call's audio context; a new one if the previous one was closed. */
  const ensureAudio = useCallback(() => {
    if (!audio.current || audio.current.state === "closed") { audio.current = new AudioContext(); lipSync.current = null }
    lipSync.current ??= startLipSync(audio.current)
    return audio.current
  }, [])

  useEffect(() => {
    fetch("/api/tts/health").then((response) => response.json())
      .then((body: { available?: boolean; stt?: boolean }) => { setVoice(body.available ? "online" : "offline"); setListening(body.stt ? "ok" : "offline") })
      .catch(() => { setVoice("offline"); setListening("offline") })
  }, [])

  useEffect(() => {
    let disposed = false
    import("./vrm-stage")
      .then(({ createVrmStage }) => createVrmStage(canvas.current!, teller.model))
      .then((created) => { if (disposed) created.dispose(); else { stage.current = created; setModel("ready") } })
      .catch((cause) => { console.error("[call] model failed to load", cause); if (!disposed) setModel("failed") })
    return () => {
      disposed = true
      stage.current?.dispose()
      stage.current = null
      // Forget it at once: close() only marks the context closed when its promise resolves.
      const closing = audio.current
      audio.current = null
      lipSync.current = null
      void closing?.close()
    }
  }, [teller.model])

  // Open mic for the whole call (ADR-0016): echo-cancelled capture → 20 ms frames → turn detection.
  useEffect(() => {
    if (mode !== "chat") return
    let stopped = false
    let node: AudioWorkletNode | undefined
    void (async () => {
      try {
        const context = ensureAudio()
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        if (stopped) { stream.getTracks().forEach((track) => track.stop()); return }
        micStream.current = stream
        await context.audioWorklet.addModule("/call/mic-processor.js")
        if (stopped) return
        const sink = context.createGain()
        sink.gain.value = 0
        node = new AudioWorkletNode(context, "oracle-mic")
        context.createMediaStreamSource(stream).connect(node).connect(sink).connect(context.destination)
        const turns = createTurnDetector({ sampleRate: context.sampleRate })
        detector.current = turns
        node.port.onmessage = (message: MessageEvent<Float32Array>) => {
          if (!micOn.current) return
          for (const event of turns.push(message.data)) onTurnEvent.current(event, context.sampleRate)
        }
        micOn.current = true
        setMic("on")
      } catch (cause) {
        console.warn("[call] microphone unavailable", cause)
        if (!stopped) setMic("blocked")
      }
    })()
    return () => {
      stopped = true
      micOn.current = false
      node?.port.close()
      node?.disconnect()
      micStream.current?.getTracks().forEach((track) => track.stop())
      micStream.current = null
    }
  }, [mode, ensureAudio])

  useEffect(() => {
    stage.current?.setState({ body: state.body, expression: state.expression })
  }, [state.body, state.expression, model])

  // Play the current sentence whenever nothing is playing. The reducer advances the queue.
  useEffect(() => {
    const line = state.current
    if (state.body === "speaking" || !line || playing.current) return
    playing.current = true
    const started = generation.current
    const finish = (type: "audioEnded" | "audioFailed") => {
      playing.current = false
      playingSource.current = null
      stage.current?.setAudio({ analyser: null, lipSync: null })
      if (generation.current === started) dispatch({ type })
    }
    void (async () => {
      try {
        const response = await requestSpeech(line.text)
        prefetched.current.delete(line.text)
        if (!response.ok) throw new Error(response.status === 503 ? "offline" : `HTTP ${response.status}`)
        const context = audio.current!
        const buffer = await context.decodeAudioData(await response.arrayBuffer())
        if (generation.current !== started) { playing.current = false; return } // interrupted while fetching
        const source = context.createBufferSource()
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        source.buffer = buffer
        source.connect(analyser).connect(context.destination)
        const vowels = await lipSync.current
        if (vowels) source.connect(vowels)
        source.onended = () => finish("audioEnded")
        playingSource.current = source
        setVoice("online")
        stage.current?.setAudio({ analyser, lipSync: vowels })
        dispatch({ type: "audioStarted" })
        source.start()
      } catch (cause) {
        if (generation.current !== started) { playing.current = false; return }
        if (cause instanceof Error && cause.message !== "offline") console.error("[call] speech failed", cause)
        setVoice("offline")
        dispatch({ type: "audioStarted" })
        setTimeout(() => finish("audioFailed"), subtitleMs(line.text))
      }
    })()
  }, [state, requestSpeech])

  /** The owner spoke over the teller: stop her now and drop the rest of that turn. */
  function interrupt() {
    generation.current += 1
    prefetched.current.clear()
    const source = playingSource.current
    playingSource.current = null
    playing.current = false
    stage.current?.setAudio({ analyser: null, lipSync: null })
    source?.stop()
    dispatch({ type: "interrupt", streaming: inFlight.current })
  }

  async function transcribe(samples: Float32Array, sampleRate: number) {
    try {
      const response = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: encodeWav(downsample(samples, sampleRate, 16000), 16000).buffer as ArrayBuffer })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { text } = await response.json() as { text?: string }
      const said = text?.trim()
      if (!said) return
      setError("")
      setOwnerCaption(said)
      if (inFlight.current) pendingTalk.current = pendingTalk.current ? `${pendingTalk.current} ${said}` : said
      else void talk(said)
    } catch (cause) {
      console.warn("[call] transcription failed", cause)
      setError(CANT_HEAR)
    }
  }

  onTurnEvent.current = (event, sampleRate) => {
    if (event.type === "speechStart") {
      setHearing(true)
      const now = stateNow.current
      if (now.body === "thinking" || now.body === "speaking" || now.current) interrupt()
    } else {
      setHearing(false)
      if (event.type === "turn") void transcribe(event.samples, sampleRate)
    }
  }

  function toggleMic() {
    const next = !micOn.current
    micOn.current = next
    micStream.current?.getAudioTracks().forEach((track) => { track.enabled = next })
    detector.current?.reset()
    setHearing(false)
    setMic(next ? "on" : "muted")
  }

  /** Speaks the teller's sentences and keeps the panel's reading current, for turns and interactions alike. */
  function onCallEvent(event: Record<string, unknown> & { type: string }) {
    if (event.type === "sentence" && typeof event.text === "string") {
      if (!stateNow.current.dropTurn) void requestSpeech(event.text).catch(() => undefined)
      dispatch({ type: "say", text: event.text, expression: (event.expression as Expression | undefined) ?? "neutral" })
    } else if ((event.type === "message_complete" || event.type === "message_update") && event.message && typeof event.message === "object") {
      const message = event.message as CallMessage
      if (callPanel(teller.name, message)) setReading(message)
      else setReading((current) => current?.id === message.id ? null : current)
    }
  }

  /** A pick, reveal, toss or birth-details submission from the panel, sent with the call flag so the reply is spoken. */
  async function interact(messageId: string, action: InteractionAction) {
    if (inFlight.current) return
    const completes = action.action === "reveal" || action.action === "toss" || action.action === "submit"
    inFlight.current = true
    setTurnInFlight(true)
    setError("")
    void ensureAudio().resume()
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...action, call: true }),
      })
      if (response.ok && response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
        dispatch({ type: "think" })
        await readEvents(response.body, onCallEvent)
        dispatch({ type: "turnEnded" })
      } else {
        const body = await response.json().catch(() => ({})) as { message?: CallMessage; error?: string }
        if (!response.ok || !body.message) throw new Error(body.error ?? "That didn't work. Try again.")
        onCallEvent({ type: "message_update", message: body.message })
      }
    } catch (cause) {
      dispatch({ type: "turnEnded" })
      setError(cause instanceof Error ? cause.message : "That didn't work. Try again.")
      if (action.action === "submit") throw cause
    } finally {
      inFlight.current = false
      setTurnInFlight(false)
      if (completes) onTurnComplete()
    }
  }

  async function talk(content: string) {
    inFlight.current = true
    setTurnInFlight(true)
    dispatch({ type: "think" })
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, call: true }),
      })
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? "Mira couldn't answer just now.")
      }
      await readEvents(response.body, onCallEvent)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The reply failed")
    } finally {
      dispatch({ type: "turnEnded" })
      inFlight.current = false
      setTurnInFlight(false)
      onTurnComplete()
      const next = pendingTalk.current
      pendingTalk.current = null
      if (next) void talk(next)
    }
  }

  function send() {
    const result = validateSentence(draft)
    if (!result.ok) { setError(result.error); return }
    setError("")
    setDraft("")
    setOwnerCaption("")
    // Resumed inside the click so the browser allows playback.
    void ensureAudio().resume()
    if (mode === "say") dispatch({ type: "say", text: result.text })
    else void talk(result.text)
  }

  function end() {
    dispatch({ type: "end" })
    onEnd()
  }

  const panelContent = reading && callPanel(teller.name, reading)
  const panel = reading && panelContent && <CallPanel tellerName={teller.name} panel={panelContent} busy={turnInFlight}
    onInteract={(action) => interact(reading.id, action)} onAsk={(question) => { if (!inFlight.current) void talk(question) }} searchPlaces={searchPlaces} />

  return <CallOverlayView
    tellerName={teller.name}
    voice={voice}
    model={model}
    state={state.body === "ended" ? "idle" : state.body}
    {...(state.body === "speaking" && state.current ? { subtitle: state.current.text } : {})}
    {...(panel ? { panel } : {})}
    {...(error ? { error } : {})}
    {...(mic ? { mic } : {})}
    {...(listening ? { listening } : {})}
    hearing={hearing}
    {...(ownerCaption ? { ownerCaption } : {})}
    onToggleMic={toggleMic}
    busy={turnInFlight}
    draft={draft}
    {...(mode === "say" ? { placeholder: `Type something for ${teller.name} to say` } : {})}
    onDraft={setDraft}
    onSay={send}
    onEnd={end}
    stage={<canvas ref={canvas} className="call-canvas" />}
  />
}
