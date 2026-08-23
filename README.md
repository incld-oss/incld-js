# incld JavaScript SDK

The public JavaScript and React SDKs for [incld](https://incld.dev): durable
schedules, approvals, audit trails, and bulk operations for application teams.

## Packages

| Package | Purpose |
| --- | --- |
| `@incld/cli` | Safe Next.js App Router initializer (`npx @incld/cli init`) |
| `@incld/client` | Trusted server client, credential-free browser client, signed webhooks, and Next.js, Express, SvelteKit, and Nuxt adapters |
| `@incld/react` | Shared provider, visible-tab automatic refresh, appearance contract, and async primitives |
| `@incld/react-schedules` | Scheduling components and hooks |
| `@incld/react-approvals` | Approval workflow components and hooks |
| `@incld/react-audit` | Audit trail components and hooks |
| `@incld/react-bulk` | Bulk-operation progress components and hooks |

The `nextjs-*` packages are tested compatibility wrappers and remain private
until their publication policy is finalized. The Svelte packages are
experimental and unpublished.

## Install

For an existing Next.js App Router project:

```bash
npx @incld/cli init
```

Preview the generated routes, provider, environment template, and dependencies
without changing the project with `npx @incld/cli init --dry-run`. The
initializer refuses to overwrite files and generates a deny-by-default server
authorization hook.

For manual installation:

```bash
npm install @incld/client @incld/react
```

Add the feature packages your application uses. The complete App Router
integration lives in [`examples/nextjs`](examples/nextjs).

Mounted React query hooks refresh every five seconds by default, pause while
the browser tab is hidden, and refresh immediately when it becomes visible.
Set `refreshInterval={false}` on `IncldProvider` to opt into manual refreshes.

## Development

Install [Bun](https://bun.sh) and Node.js 20.9 or newer, then run:

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run verify:packages
bun run verify:consumer

cd examples/nextjs
npm ci
npm run verify
```

The OpenAPI snapshot at [`openapi.yaml`](openapi.yaml) is exercised by the
browser-proxy contract suite. Generated component prop references are checked
for drift in CI.

## Releases

This repository uses Changesets. Add a changeset with `bun run changeset`,
commit the generated version changes, and publish a GitHub release for that
commit. Public npm packages are published from GitHub Actions with npm trusted
publishing and provenance.

## Security

Do not report vulnerabilities in public issues. Follow
[`SECURITY.md`](SECURITY.md) instead.

## License

MIT
