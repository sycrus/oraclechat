import { fileURLToPath } from "node:url"
import { copyTellerDefinitions } from "../dist/tellers/copy-definitions.js"

const sourceDirectory = fileURLToPath(new URL("../src/tellers/definitions", import.meta.url))
const destinationDirectory = fileURLToPath(new URL("../dist/tellers/definitions", import.meta.url))

copyTellerDefinitions(sourceDirectory, destinationDirectory)
