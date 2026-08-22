import type { NextConfig } from "next"
import path from "node:path"

const config: NextConfig = {
  reactStrictMode: true,
  // The fixture consumes the SDK workspaces through file: links from the repo root.
  // Keep those linked package sources inside Turbopack's resolution boundary.
  turbopack: {
    root: path.resolve(__dirname, "../../.."),
  },
}

export default config
