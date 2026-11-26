// Drive the running OracleChat with headless Chromium and save screenshots.
// Usage: node .claude/skills/live-check/shot.mjs [--base URL] [--out DIR] [--phone] [--console] step...
// Steps: goto:/path  click:<button name or text>  fill:<label>=<text>  press:<key>
//        wait:<ms>  waitfor:<text>  shot:<name>   (each shot is written as <out>/<name>.png)
import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const { chromium } = createRequire(join(root, "frontend/app/package.json"))("@playwright/test")

const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; const [v] = args.splice(i, 2).slice(1); return v }
const has = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true }
const base = flag("--base", "http://127.0.0.1:3000")
const out = resolve(flag("--out", join(root, "logs/live-check")))
const phone = has("--phone")
const showConsole = has("--console")
mkdirSync(out, { recursive: true })

// Installed Chrome: Playwright's own browser builds go stale whenever the package updates.
const browser = await chromium.launch({ channel: "chrome", args: ["--use-gl=angle", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: phone ? 2 : 1 })
const errors = []
// "Failed to load resource" duplicates the response listener below (and is otherwise only favicon.ico).
page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(m.text()); if (showConsole) console.log(`[console.${m.type()}] ${m.text()}`) })
page.on("pageerror", (e) => errors.push(String(e)))
page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.request().method()} ${r.url()}`) })

await page.goto(base)
let failed = false
for (const step of args) {
  const at = step.indexOf(":"), op = step.slice(0, at), arg = step.slice(at + 1)
  try {
    if (op === "goto") await page.goto(new URL(arg, base).href)
    else if (op === "click") await page.getByRole("button", { name: arg }).or(page.getByText(arg, { exact: true })).first().click({ timeout: 15_000 })
    else if (op === "fill") { const eq = arg.indexOf("="); await page.getByLabel(arg.slice(0, eq)).first().fill(arg.slice(eq + 1)) }
    else if (op === "press") await page.keyboard.press(arg)
    else if (op === "wait") await page.waitForTimeout(Number(arg))
    else if (op === "waitfor") await page.getByText(arg).first().waitFor({ timeout: 120_000 })
    else if (op === "shot") { const file = join(out, `${arg}.png`); await page.screenshot({ path: file }); console.log(`shot ${file}`) }
    else throw new Error(`unknown step "${op}"`)
    console.log(`ok   ${step}`)
  } catch (error) {
    console.log(`FAIL ${step}: ${error.message.split("\n")[0]}`)
    await page.screenshot({ path: join(out, "failure.png") })
    console.log(`shot ${join(out, "failure.png")}`)
    failed = true
    break
  }
}
if (errors.length) console.log(`console errors:\n  ${errors.join("\n  ")}`)
await browser.close()
process.exitCode = failed ? 1 : 0
