import { readFileSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"
import { parse as parseYaml } from "yaml"
import { tellerDefinitionSchema, type TellerDefinition } from "./schema.js"

export class TellerRegistry {
  private tellers = new Map<string, TellerDefinition>()

  register(definition: TellerDefinition): void {
    const result = tellerDefinitionSchema.safeParse(definition)
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      throw new Error(`Invalid teller definition: ${issues}`)
    }
    if (this.tellers.has(result.data.id)) {
      throw new Error(`Duplicate teller ID: ${result.data.id}`)
    }
    this.tellers.set(result.data.id, result.data)
  }

  get(id: string): TellerDefinition | undefined {
    return this.tellers.get(id)
  }

  list(): TellerDefinition[] {
    return [...this.tellers.values()]
  }

  async loadFromDirectory(dir: string): Promise<void> {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      // Directory doesn't exist or isn't readable — skip silently
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      if (extname(entry) !== ".yaml" && extname(entry) !== ".yml") continue
      if (!statSync(fullPath).isFile()) continue

      try {
        const raw = readFileSync(fullPath, "utf-8")
        const parsed = parseYaml(raw)
        if (!parsed || typeof parsed !== "object" || !("teller" in parsed)) {
          console.warn(`Skipping ${entry}: missing top-level 'teller' key`)
          continue
        }
        this.register(parsed.teller as TellerDefinition)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`Skipping ${entry}: ${message}`)
      }
    }
  }
}
