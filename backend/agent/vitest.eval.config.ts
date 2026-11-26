import { defineConfig } from "vitest/config"

/** The teller model comparison (eval/): calls Ollama and the hosted model, so it runs only through `pnpm eval:models`. */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["eval/**/*.eval.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 3 * 60 * 60 * 1000,
  },
})
