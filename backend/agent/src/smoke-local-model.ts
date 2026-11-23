import { loadLocalModelConfig, runLocalAgent } from "./agent/runtime.js"

const output = await runLocalAgent({
  name: "Oracle local model smoke test",
  instructions: "Reply with exactly READY.",
  input: "Confirm that the local model is available.",
}, loadLocalModelConfig())

console.log(output)
