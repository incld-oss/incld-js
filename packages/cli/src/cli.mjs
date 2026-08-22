import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const VERSION = "0.1.0"
const FEATURE_PACKAGES = {
  schedules: "@incld/react-schedules",
  approvals: "@incld/react-approvals",
  audit: "@incld/react-audit",
  bulk: "@incld/react-bulk",
}

const HELP = `Usage: incld init [directory] [options]

Scaffold incld into an existing Next.js App Router project.

Options:
  --features <list>          Comma-separated features (default: schedules)
                             Available: schedules, approvals, audit, bulk, none
  --package-manager <name>   npm, pnpm, yarn, or bun
  --no-install               Create files without installing packages
  --dry-run                  Show the planned changes without writing files
  -h, --help                 Show help
  -v, --version              Show the version

Examples:
  npx @incld/cli init
  npx @incld/cli init ./apps/web --features schedules,approvals
  npx @incld/cli init --no-install --dry-run`

function parseArguments(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true }
  if (argv.includes("--version") || argv.includes("-v")) return { version: true }

  const args = [...argv]
  const command = args.shift()
  if (command !== "init") {
    throw new Error(`Expected the \"init\" command.\n\n${HELP}`)
  }

  const options = {
    directory: ".",
    features: ["schedules"],
    packageManager: undefined,
    install: true,
    dryRun: false,
  }

  let directorySeen = false
  while (args.length > 0) {
    const argument = args.shift()
    if (argument === "--no-install") {
      options.install = false
    } else if (argument === "--dry-run") {
      options.dryRun = true
    } else if (argument === "--features") {
      const value = args.shift()
      if (!value) throw new Error("--features requires a comma-separated value")
      options.features = parseFeatures(value)
    } else if (argument?.startsWith("--features=")) {
      options.features = parseFeatures(argument.slice("--features=".length))
    } else if (argument === "--package-manager") {
      const value = args.shift()
      if (!value) throw new Error("--package-manager requires a value")
      options.packageManager = parsePackageManager(value)
    } else if (argument?.startsWith("--package-manager=")) {
      options.packageManager = parsePackageManager(argument.slice("--package-manager=".length))
    } else if (argument?.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`)
    } else if (directorySeen) {
      throw new Error(`Unexpected argument: ${argument}`)
    } else {
      options.directory = argument
      directorySeen = true
    }
  }

  return options
}

function parseFeatures(value) {
  const requested = value.split(",").map((feature) => feature.trim()).filter(Boolean)
  if (requested.length === 1 && requested[0] === "none") return []
  if (requested.length === 0) throw new Error("Select at least one feature or use --features none")

  const unknown = requested.filter((feature) => !(feature in FEATURE_PACKAGES))
  if (unknown.length > 0) {
    throw new Error(`Unknown feature${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`)
  }
  return [...new Set(requested)]
}

function parsePackageManager(value) {
  if (!["npm", "pnpm", "yarn", "bun"].includes(value)) {
    throw new Error(`Unsupported package manager: ${value}`)
  }
  return value
}

function readManifest(projectDirectory) {
  const manifestPath = join(projectDirectory, "package.json")
  if (!existsSync(manifestPath)) throw new Error(`No package.json found in ${projectDirectory}`)

  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"))
  } catch {
    throw new Error(`Could not parse ${manifestPath}`)
  }
}

function detectProject(projectDirectory, manifest) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  if (!dependencies.next) {
    throw new Error("This command must run in an existing Next.js project")
  }

  const sourceApp = join(projectDirectory, "src", "app")
  const rootApp = join(projectDirectory, "app")
  const appDirectory = existsSync(sourceApp) ? sourceApp : existsSync(rootApp) ? rootApp : undefined
  if (!appDirectory) {
    throw new Error("No App Router directory found. Expected app/ or src/app/")
  }

  const sourceRoot = dirname(appDirectory)
  const typescript = existsSync(join(projectDirectory, "tsconfig.json"))
  return { appDirectory, sourceRoot, typescript }
}

function detectPackageManager(projectDirectory) {
  if (existsSync(join(projectDirectory, "bun.lock")) || existsSync(join(projectDirectory, "bun.lockb"))) return "bun"
  if (existsSync(join(projectDirectory, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(projectDirectory, "yarn.lock"))) return "yarn"
  return "npm"
}

function templates(project) {
  const script = project.typescript ? "ts" : "js"
  const component = project.typescript ? "tsx" : "jsx"
  const definedEnvironment = project.typescript ? "!" : ""
  const providerSignature = project.typescript
    ? 'export function IncldProviders({ children }: { children: IncldProviderProps["children"] }) {'
    : "export function IncldProviders({ children }) {"
  const providerImport = project.typescript
    ? 'import { IncldProvider, type IncldProviderProps } from "@incld/react"'
    : 'import { IncldProvider } from "@incld/react"'

  return [
    {
      path: join(project.sourceRoot, "lib", `incld.${script}`),
      content: `import "server-only"
import { createIncld, defineActions } from "@incld/client/next"

const actions = defineActions({
  // Add your server-owned action definitions here.
})

export const incld = createIncld({
  apiKey: process.env.INCLD_SECRET_KEY${definedEnvironment},
  webhookSecret: process.env.INCLD_WEBHOOK_SECRET${definedEnvironment},
  baseUrl: process.env.INCLD_API_URL,
  actions,
  async resolveContext() {
    // Replace with your server-side session lookup. Never trust browser-supplied identity.
    return null
  },
  async authorize() {
    // Deny by default until this is connected to your application's authorization policy.
    return false
  },
})
`,
    },
    {
      path: join(project.appDirectory, "api", "incld", "v1", "[...path]", `route.${script}`),
      content: `import { incld } from "../../../../../lib/incld"

export const dynamic = "force-dynamic"
export const { GET, POST, PATCH, DELETE } = incld.routes
`,
    },
    {
      path: join(project.appDirectory, "api", "incld", "webhook", `route.${script}`),
      content: `import { incld } from "../../../../lib/incld"

export const dynamic = "force-dynamic"
export const POST = incld.webhook
`,
    },
    {
      path: join(project.appDirectory, `incld-providers.${component}`),
      content: `"use client"

${providerImport}

${providerSignature}
  return (
    <IncldProvider
      baseUrl="/api/incld"
      appearance={{ colorScheme: "system", accentColor: "indigo" }}
      onError={(error) => console.error(error.code, error.requestId)}
    >
      {children}
    </IncldProvider>
  )
}
`,
    },
    {
      path: join(project.projectDirectory, ".env.incld.example"),
      content: `# Copy these values into your local and deployment environment.
INCLD_SECRET_KEY=sk_replace_me
INCLD_WEBHOOK_SECRET=whsec_replace_me
# INCLD_API_URL=https://api.incld.dev
`,
    },
  ]
}

function installPackages(packageManager, packages, projectDirectory) {
  const args = packageManager === "npm" ? ["install", ...packages] : ["add", ...packages]
  const result = spawnSync(packageManager, args, {
    cwd: projectDirectory,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.error) throw new Error(`Could not run ${packageManager}: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${packageManager} ${args.join(" ")} exited with status ${result.status}`)
}

function relativeDisplay(projectDirectory, filePath) {
  return filePath.slice(projectDirectory.length + 1)
}

function scaffold(options) {
  const projectDirectory = resolve(options.directory)
  const manifest = readManifest(projectDirectory)
  const detected = detectProject(projectDirectory, manifest)
  const project = { ...detected, projectDirectory }
  const packageManager = options.packageManager ?? detectPackageManager(projectDirectory)
  const packages = ["@incld/client", "@incld/react", ...options.features.map((feature) => FEATURE_PACKAGES[feature])]
  const files = templates(project)
  const collisions = files.filter((file) => existsSync(file.path))

  if (collisions.length > 0) {
    throw new Error(`Refusing to overwrite existing files:\n${collisions.map((file) => `- ${relativeDisplay(projectDirectory, file.path)}`).join("\n")}`)
  }

  console.log(`\nINCLD Next.js setup for ${projectDirectory}`)
  console.log(`Package manager: ${packageManager}`)
  console.log(`Packages: ${packages.join(", ")}`)
  console.log("Files:")
  for (const file of files) console.log(`- ${relativeDisplay(projectDirectory, file.path)}`)

  if (options.dryRun) {
    console.log("\nDry run complete. No files or dependencies were changed.")
    return
  }

  if (options.install) installPackages(packageManager, packages, projectDirectory)
  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true })
    writeFileSync(file.path, file.content, { encoding: "utf8", flag: "wx" })
  }

  const featureStyles = options.features.map((feature) => `import "${FEATURE_PACKAGES[feature]}/styles.css"`)
  console.log(`\nCreated ${files.length} files${options.install ? " and installed dependencies" : ""}.`)
  console.log("\nNext steps:")
  console.log("1. Copy .env.incld.example values into your local and deployment environments.")
  console.log("2. Implement resolveContext and authorize in your generated lib/incld file.")
  console.log("3. Wrap your root layout children with <IncldProviders>.")
  console.log('4. Add import "@incld/react/styles.css" to your root layout.')
  for (const style of featureStyles) console.log(`   ${style}`)
  console.log("5. Define your server-owned actions, then synchronize them before use.")
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv)
  if (options.help) {
    console.log(HELP)
    return
  }
  if (options.version) {
    console.log(VERSION)
    return
  }
  scaffold(options)
}

export { parseArguments, scaffold }
