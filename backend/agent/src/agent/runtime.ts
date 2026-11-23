import { Agent, OpenAIProvider, Runner, setTracingDisabled, type AgentOutputType } from "@openai/agents"
import { withSpan } from "../observability/otel.js"
import type { Span } from "@opentelemetry/api"

export interface LocalModelConfig {
  baseURL: string
  model: string
  /** API key for a hosted OpenAI-compatible provider (ADR-0014); Ollama ignores it. */
  apiKey?: string
  /** Provider label for traces; defaults to "ollama". */
  system?: string
}

export interface AgentRequest {
  name: string
  instructions: string
  input: string
  /** false asks the local endpoint for no hidden reasoning; omitted keeps the model default. */
  thinking?: boolean
  /** Sampling temperature; omitted keeps the model default. */
  temperature?: number
  /** Constrains the output to JSON matching this schema; the result is returned as a JSON string. */
  outputSchema?: { name: string; schema: Record<string, unknown> }
}

export type AgentTextChunkHandler = (chunk: string) => void

export function loadLocalModelConfig(env: NodeJS.ProcessEnv = process.env): LocalModelConfig {
  const model = env["OLLAMA_MODEL"]?.trim()
  if (!model) throw new Error("OLLAMA_MODEL must name an installed local model")

  return {
    baseURL: env["OLLAMA_BASE_URL"]?.trim() || "http://127.0.0.1:11434/v1",
    model,
  }
}

export async function runLocalAgent(
  request: AgentRequest,
  config: LocalModelConfig = loadLocalModelConfig(),
): Promise<string> {
  return withSpan("oracle.agent.run", {}, async (span) => {
    markGeneration(span, request, config)
    const result = await createRunner(config).run(createAgent(request, config), request.input)
    recordUsage(span, result.runContext.usage)
    if (request.outputSchema && result.finalOutput !== undefined && typeof result.finalOutput !== "string") {
      return JSON.stringify(result.finalOutput)
    }
    if (typeof result.finalOutput !== "string") {
      throw new Error("Local agent returned no text output")
    }
    return result.finalOutput
  })
}

export async function streamLocalAgent(
  request: AgentRequest,
  onChunk: AgentTextChunkHandler,
  config: LocalModelConfig = loadLocalModelConfig(),
): Promise<string> {
  return withSpan("oracle.agent.run", {}, async (span) => {
    markGeneration(span, request, config)
    const stream = await createRunner(config).run(createAgent(request, config), request.input, { stream: true })
    const textStream = stream.toTextStream({ compatibleWithNodeStreams: true })
    let output = ""

    for await (const chunk of textStream) {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8")
      output += text
      onChunk(text)
    }

    await stream.completed
    recordUsage(span, stream.runContext.usage)
    return output
  })
}

function createRunner(config: LocalModelConfig): Runner {
  setTracingDisabled(true)
  const provider = new OpenAIProvider({
    apiKey: config.apiKey ?? "ollama",
    baseURL: config.baseURL,
    useResponses: false,
  })
  return new Runner({
    modelProvider: provider,
    tracingDisabled: true,
    traceIncludeSensitiveData: false,
  })
}

function createAgent(request: AgentRequest, config: LocalModelConfig): Agent<unknown, AgentOutputType> {
  return new Agent<unknown, AgentOutputType>({
    name: request.name,
    instructions: request.instructions,
    model: config.model,
    modelSettings: {
      ...(request.thinking === false ? { reasoning: { effort: "none" as const } } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    },
    ...(request.outputSchema ? { outputType: { type: "json_schema" as const, name: request.outputSchema.name, strict: true, schema: request.outputSchema.schema as never } } : {}),
  })
}

function markGeneration(span: Span, request: AgentRequest, config: LocalModelConfig): void {
  span.setAttribute("langfuse.observation.type", "generation")
  span.setAttribute("gen_ai.system", config.system ?? "ollama")
  span.setAttribute("langsmith.span.kind", "llm")
  span.setAttribute("gen_ai.request.model", config.model)
  span.setAttribute("oracle.agent.name", request.name)
  span.setAttribute("oracle.agent.thinking", request.thinking !== false)
}

function recordUsage(span: Span, usage: { inputTokens: number; outputTokens: number } | undefined): void {
  if (!usage || (usage.inputTokens === 0 && usage.outputTokens === 0)) return
  span.setAttribute("gen_ai.usage.input_tokens", usage.inputTokens)
  span.setAttribute("gen_ai.usage.output_tokens", usage.outputTokens)
}
