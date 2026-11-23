import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { copyTellerDefinitions } from "../../src/tellers/copy-definitions.js"

describe("production teller assets", () => {
  let root: string | undefined

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it("copies YAML teller definitions to the distribution directory", () => {
    root = mkdtempSync(join(tmpdir(), "oracle-teller-assets-"))
    const source = join(root, "src", "definitions")
    const destination = join(root, "dist", "definitions")
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, "mira.yaml"), "teller: mira\n")
    writeFileSync(join(source, "sage.yml"), "teller: sage\n")

    copyTellerDefinitions(source, destination)

    expect(readFileSync(join(destination, "mira.yaml"), "utf8")).toBe("teller: mira\n")
    expect(readFileSync(join(destination, "sage.yml"), "utf8")).toBe("teller: sage\n")
  })
})
