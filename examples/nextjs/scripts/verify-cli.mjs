import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const exampleDirectory = resolve(scriptDirectory, "..")
const repositoryDirectory = resolve(exampleDirectory, "..", "..")
const fixture = mkdtempSync(join(exampleDirectory, ".incld-cli-fixture-"))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: exampleDirectory,
    encoding: "utf8",
    env: process.env,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout ?? ""}${result.stderr ?? ""}`)
  }
}

try {
  mkdirSync(join(fixture, "src", "app"), { recursive: true })
  writeFileSync(join(fixture, "package.json"), `${JSON.stringify({
    name: "incld-cli-build-fixture",
    private: true,
    dependencies: { next: "16.3.1" },
  }, null, 2)}\n`)
  writeFileSync(join(fixture, "tsconfig.json"), `${JSON.stringify({
    extends: "../tsconfig.json",
    compilerOptions: { incremental: false },
    include: ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  }, null, 2)}\n`)
  writeFileSync(join(fixture, "next-env.d.ts"), '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n')

  run(process.execPath, [
    join(repositoryDirectory, "packages", "cli", "bin", "incld.mjs"),
    "init",
    fixture,
    "--no-install",
    "--features",
    "schedules,approvals",
  ])

  writeFileSync(join(fixture, "src", "app", "layout.tsx"), `import type { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
`)
  writeFileSync(join(fixture, "src", "app", "page.tsx"), "export default function Page() { return <main>incld</main> }\n")

  const executableSuffix = process.platform === "win32" ? ".cmd" : ""
  run(join(exampleDirectory, "node_modules", ".bin", `tsc${executableSuffix}`), ["--noEmit", "-p", join(fixture, "tsconfig.json")])
  run(join(exampleDirectory, "node_modules", ".bin", `next${executableSuffix}`), ["build", fixture], {
    env: {
      ...process.env,
      INCLD_SECRET_KEY: "sk_cli_fixture",
      INCLD_WEBHOOK_SECRET: "whsec_cli_fixture",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  })
  console.log("Generated CLI fixture passed TypeScript and Next.js production builds.")
} finally {
  rmSync(fixture, { recursive: true, force: true })
}
