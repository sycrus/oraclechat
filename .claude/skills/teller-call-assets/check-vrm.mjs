// Check that a file is a usable VRM for Oracle calls: glTF binary, VRM 0.x or 1.0,
// humanoid bones (head included), and vowel mouth shapes for lip sync.
// Usage: node .claude/skills/teller-call-assets/check-vrm.mjs <file.vrm>
import { readFileSync } from "node:fs"

const file = process.argv[2]
if (!file) { console.error("usage: check-vrm.mjs <file.vrm>"); process.exit(2) }
const buf = readFileSync(file)
const fail = (why) => { console.log(`FAIL ${why}`); process.exit(1) }

if (buf.length < 20 || buf.toString("ascii", 0, 4) !== "glTF") fail("not a glTF binary (no 'glTF' magic) — an HTML error page or LFS pointer?")
if (buf.readUInt32LE(12) === 0 || buf.toString("ascii", 16, 20) !== "JSON") fail("first chunk is not JSON")
const gltf = JSON.parse(buf.toString("utf8", 20, 20 + buf.readUInt32LE(12)))

const v0 = gltf.extensions?.VRM, v1 = gltf.extensions?.VRMC_vrm
if (!v0 && !v1) fail("no VRM or VRMC_vrm extension — plain glTF, not a VRM")

let version, bones, vowels, expressions
if (v1) {
  version = `1.0 (${v1.specVersion ?? "?"})`
  bones = Object.keys(v1.humanoid?.humanBones ?? {})
  const preset = v1.expressions?.preset ?? {}
  expressions = Object.keys(preset)
  vowels = ["aa", "ih", "ou", "ee", "oh"].filter((k) => k in preset)
} else {
  version = `0.x (${v0.specVersion ?? v0.exporterVersion ?? "?"})`
  bones = (v0.humanoid?.humanBones ?? []).map((b) => b.bone)
  const presets = (v0.blendShapeMaster?.blendShapeGroups ?? []).map((g) => (g.presetName || g.name || "").toLowerCase())
  expressions = presets
  vowels = ["a", "i", "u", "e", "o"].filter((k) => presets.includes(k))
}

console.log(`VRM ${version}, ${(buf.length / 1e6).toFixed(1)} MB`)
console.log(`title: ${v1?.meta?.name ?? v0?.meta?.title ?? "?"}  author: ${(v1?.meta?.authors ?? [v0?.meta?.author]).join(", ")}`)
console.log(`license: ${v1?.meta?.licenseUrl ?? v0?.meta?.licenseName ?? "?"}`)
console.log(`humanoid bones: ${bones.length}`)
console.log(`vowel shapes: ${vowels.join(", ") || "none"} (of 5)`)
console.log(`expressions: ${expressions.join(", ")}`)

const problems = []
for (const bone of ["hips", "spine", "neck", "head"]) if (!bones.includes(bone)) problems.push(`missing ${bone} bone (calls frame the camera from the head)`)
if (vowels.length < 5) problems.push("fewer than 5 vowel shapes: lip sync falls back to loudness only")
if (!expressions.some((e) => e.startsWith("blink"))) problems.push("no blink expression")
for (const p of problems) console.log(`WARN ${p}`)
if (problems.some((p) => p.includes("bone"))) process.exit(1)
console.log("OK usable for calls")
