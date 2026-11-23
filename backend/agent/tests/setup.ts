// Tests see the same settings as the server, which starts with `node --env-file-if-exists=../../.env`: the repo's .env
// is read with Node's own parser, variables already in the environment win, and a missing file (as in CI) is fine.
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url))

if (existsSync(envFile)) {
  for (const [name, value] of Object.entries(parseEnv(readFileSync(envFile, "utf8")))) {
    if (!(name in process.env)) process.env[name] = value
  }
}
