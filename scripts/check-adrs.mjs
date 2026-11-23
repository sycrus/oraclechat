import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const ADR_FILENAME = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/
const ADR_REFERENCE = /ADR-(\d{4})/g
const ADR_STATUSES = new Set(["proposed", "accepted", "superseded", "deprecated"])
const REQUIRED_SECTIONS = ["Context", "Decision", "Consequences", "Validation"]

function readText(path) {
  return readFileSync(path, "utf8")
}

function relativePath(rootDir, path) {
  return relative(rootDir, path).split(sep).join("/")
}

function parseAdrReferences(text) {
  return [...new Set([...text.matchAll(ADR_REFERENCE)].map((match) => `ADR-${match[1]}`))].sort()
}

function parseReviewLine(text, filePath, errors) {
  const reviewLine = text.match(/^ADRs reviewed:\s*(.*?)\s*$/im)
  if (!reviewLine) {
    errors.push(`${filePath}: add an "ADRs reviewed:" line (use "none" when no ADR applies).`)
    return null
  }

  const value = reviewLine[1]
  if (/^none\b/i.test(value)) return []

  const references = parseAdrReferences(value)
  if (references.length === 0) {
    errors.push(`${filePath}: list ADR-#### references or write "none" on the ADR review line.`)
    return null
  }
  return references
}

export function checkArchitectureDocs(rootDir = process.cwd()) {
  const errors = []
  const adrDir = join(rootDir, "docs", "adr")
  const indexPath = join(adrDir, "README.md")
  const changesDir = join(rootDir, "openspec", "changes")

  let adrEntries
  try {
    adrEntries = readdirSync(adrDir, { withFileTypes: true })
  } catch {
    return [`docs/adr is missing; add an ADR index and at least one numbered ADR.`]
  }

  const adrs = new Map()
  for (const entry of adrEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md" || entry.name === "template.md") continue
    const match = entry.name.match(ADR_FILENAME)
    const filePath = join(adrDir, entry.name)
    if (!match) {
      errors.push(`${relativePath(rootDir, filePath)}: ADR filenames must use NNNN-kebab-case.md.`)
      continue
    }

    const id = `ADR-${match[1]}`
    if (adrs.has(id)) errors.push(`${relativePath(rootDir, filePath)}: duplicate ADR id ${id}.`)
    const content = readText(filePath)
    if (!new RegExp(`^# ${id}:\\s+.+$`, "m").test(content)) {
      errors.push(`${relativePath(rootDir, filePath)}: title must start with "# ${id}:".`)
    }

    const status = content.match(/^\*\*Status:\*\*\s*(\w+)\s*$/im)?.[1]?.toLowerCase()
    if (!status || !ADR_STATUSES.has(status)) {
      errors.push(`${relativePath(rootDir, filePath)}: status must be Proposed, Accepted, Superseded, or Deprecated.`)
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!new RegExp(`^## ${section}\\s*$`, "im").test(content)) {
        errors.push(`${relativePath(rootDir, filePath)}: missing required section: ${section}.`)
      }
    }

    adrs.set(id, { fileName: entry.name, status })
  }

  if (adrs.size === 0) errors.push("docs/adr: add at least one numbered ADR.")

  let indexContent = ""
  try {
    indexContent = readText(indexPath)
  } catch {
    errors.push("docs/adr/README.md is missing.")
  }

  for (const [id, adr] of adrs) {
    if (!indexContent.includes(id) || !indexContent.includes(`](${adr.fileName})`)) {
      errors.push(`docs/adr/README.md: does not index ${id} with a link to ${adr.fileName}.`)
    }
  }

  let changeEntries = []
  try {
    changeEntries = readdirSync(changesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== "archive")
  } catch {
    // A repository without OpenSpec changes still gets ADR structure validation.
  }

  for (const entry of changeEntries) {
    const changeDir = join(changesDir, entry.name)
    const proposalPath = join(changeDir, "proposal.md")
    const designPath = join(changeDir, "design.md")
    if (!statSync(changeDir).isDirectory()) continue

    let proposal
    try {
      proposal = readText(proposalPath)
    } catch {
      errors.push(`${relativePath(rootDir, changeDir)}: proposal.md is missing, so ADR impact cannot be checked.`)
      continue
    }

    let design
    try {
      design = readText(designPath)
    } catch {
      errors.push(`${relativePath(rootDir, changeDir)}: design.md is missing, so ADR alignment cannot be checked.`)
      continue
    }

    const proposalRel = relativePath(rootDir, proposalPath)
    const designRel = relativePath(rootDir, designPath)
    const proposalReferences = parseReviewLine(proposal, proposalRel, errors)

    if (!/^## ADR alignment\s*$/im.test(design)) {
      errors.push(`${designRel}: add an "## ADR alignment" section that states compliance or explains deviations.`)
    }
    const designReferences = parseReviewLine(design, designRel, errors)

    for (const reference of [...(proposalReferences ?? []), ...(designReferences ?? [])]) {
      const adr = adrs.get(reference)
      if (!adr) {
        errors.push(`${entry.name}: ${reference} is referenced but does not exist.`)
      } else if (adr.status === "superseded" || adr.status === "deprecated") {
        errors.push(`${entry.name}: ${reference} is ${adr.status}; cite its replacement instead.`)
      }
    }

    if (proposalReferences && designReferences && proposalReferences.join(",") !== designReferences.join(",")) {
      errors.push(`${designRel}: ADR references must match the proposal.md review line.`)
    }
  }

  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkArchitectureDocs()
  if (errors.length > 0) {
    console.error("Architecture decision checks failed:")
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
  } else {
    console.log("Architecture decision checks passed.")
  }
}
