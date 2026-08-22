#!/usr/bin/env node

import { main } from "../src/cli.mjs"

main().catch((error) => {
  console.error(`\nINCLD setup failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
