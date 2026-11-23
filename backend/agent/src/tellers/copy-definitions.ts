import { cpSync, mkdirSync, rmSync } from "node:fs"
import { dirname } from "node:path"

export function copyTellerDefinitions(sourceDirectory: string, destinationDirectory: string): void {
  mkdirSync(dirname(destinationDirectory), { recursive: true })
  rmSync(destinationDirectory, { recursive: true, force: true })
  cpSync(sourceDirectory, destinationDirectory, { recursive: true })
}
