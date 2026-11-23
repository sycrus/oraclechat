import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { checkArchitectureDocs } from "./check-adrs.mjs"

const validAdr = `# ADR-0001: Example decision

**Status:** Accepted
**Date:** 2026-11-17

## Context
Context.

## Decision
Decision.

## Consequences
Consequences.

## Validation
Validation.
`

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "oracle-adr-check-"))
  const adrDir = join(root, "docs", "adr")
  const changeDir = join(root, "openspec", "changes", "example")
  mkdirSync(adrDir, { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(adrDir, "0001-example-decision.md"), validAdr)
  writeFileSync(join(adrDir, "README.md"), "# ADRs\n\n- [ADR-0001: Example decision](0001-example-decision.md)\n")
  writeFileSync(join(changeDir, "proposal.md"), "## ADR review\nADRs reviewed: ADR-0001\n")
  writeFileSync(join(changeDir, "design.md"), "## ADR alignment\nADRs reviewed: ADR-0001\n")
  return root
}

test("accepts well-formed ADRs referenced by OpenSpec proposal and design", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))

  assert.deepEqual(checkArchitectureDocs(root), [])
})

test("requires each OpenSpec proposal to record which ADRs were reviewed", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "openspec", "changes", "example", "proposal.md"), "## Intent\nExample\n")

  assert.match(checkArchitectureDocs(root).join("\n"), /proposal\.md.*ADRs reviewed/i)
})

test("rejects ADR references that do not exist", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "openspec", "changes", "example", "proposal.md"), "ADRs reviewed: ADR-0099\n")

  assert.match(checkArchitectureDocs(root).join("\n"), /ADR-0099.*does not exist/i)
})

test("requires the design ADR review to match the proposal", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "openspec", "changes", "example", "design.md"), "## ADR alignment\nADRs reviewed: none\n")

  assert.match(checkArchitectureDocs(root).join("\n"), /design\.md.*match/i)
})

test("rejects ADRs missing required decision sections or an index entry", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "docs", "adr", "0001-example-decision.md"), "# ADR-0001: Example decision\n\n**Status:** Accepted\n\n## Context\nOnly context.\n")
  writeFileSync(join(root, "docs", "adr", "README.md"), "# ADRs\n")

  const errors = checkArchitectureDocs(root).join("\n")
  assert.match(errors, /missing required section: Decision/i)
  assert.match(errors, /README\.md.*does not index ADR-0001/i)
})

test("uses Windows-compatible workspace filters in root package scripts", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"))
  for (const scriptName of ["dev", "build", "test", "lint"]) {
    assert.doesNotMatch(packageJson.scripts[scriptName], /--filter '\.\//, `${scriptName} uses single-quoted filters`)
  }
})

test("skips the OpenSpec archive folder", (t) => {
  const root = makeFixture()
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, "openspec", "changes", "archive", "2026-01-01-old-change"), { recursive: true })

  assert.deepEqual(checkArchitectureDocs(root), [])
})
