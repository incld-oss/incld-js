import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { fileURLToPath } from "node:url"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const executable = resolve(testDirectory, "..", "bin", "incld.mjs")

function createProject({ next = true, source = true, typescript = true } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "incld-cli-"))
  const appDirectory = source ? join(directory, "src", "app") : join(directory, "app")
  mkdirSync(appDirectory, { recursive: true })
  writeFileSync(join(directory, "package.json"), JSON.stringify({
    private: true,
    dependencies: next ? { next: "16.3.1" } : {},
  }))
  if (typescript) writeFileSync(join(directory, "tsconfig.json"), "{}\n")
  return directory
}

function run(args) {
  return spawnSync(process.execPath, [executable, ...args], { encoding: "utf8" })
}

test("prints help", () => {
  const result = run(["--help"])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /npx @incld\/cli init/)
})

test("scaffolds a TypeScript src App Router project", () => {
  const directory = createProject()
  const result = run(["init", directory, "--no-install", "--features", "schedules,approvals"])
  assert.equal(result.status, 0, result.stderr)

  const incld = readFileSync(join(directory, "src", "lib", "incld.ts"), "utf8")
  assert.match(incld, /Never trust browser-supplied identity/)
  assert.match(incld, /return false/)
  assert.match(readFileSync(join(directory, "src", "app", "incld-providers.tsx"), "utf8"), /IncldProviderProps/)
  assert.match(readFileSync(join(directory, "src", "app", "api", "incld", "v1", "[...path]", "route.ts"), "utf8"), /incld\.routes/)
  assert.match(result.stdout, /@incld\/react-schedules, @incld\/react-approvals/)
})

test("scaffolds JavaScript in a root app directory", () => {
  const directory = createProject({ source: false, typescript: false })
  const result = run(["init", directory, "--no-install", "--features=none"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(readFileSync(join(directory, "app", "incld-providers.jsx"), "utf8"), /function IncldProviders\(\{ children \}\)/)
  assert.match(readFileSync(join(directory, "lib", "incld.js"), "utf8"), /createIncld/)
})

test("refuses to overwrite generated files", () => {
  const directory = createProject()
  const existing = join(directory, "src", "lib", "incld.ts")
  mkdirSync(dirname(existing), { recursive: true })
  writeFileSync(existing, "user-owned\n")

  const result = run(["init", directory, "--no-install"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Refusing to overwrite existing files/)
  assert.equal(readFileSync(existing, "utf8"), "user-owned\n")
})

test("rejects projects without Next.js", () => {
  const result = run(["init", createProject({ next: false }), "--no-install"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /existing Next\.js project/)
})

test("dry run makes no changes", () => {
  const directory = createProject()
  const result = run(["init", directory, "--dry-run"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /No files or dependencies were changed/)
  assert.equal(exists(join(directory, "src", "lib", "incld.ts")), false)
})

function exists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
