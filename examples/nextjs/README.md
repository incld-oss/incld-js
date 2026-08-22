# incld Next.js reference

This app is the copyable reference for the supported React components and Next.js App Router integration. It demonstrates one browser provider, a same-origin allowlisted proxy, server-owned identity, a separate signed webhook, and server-initiated bulk work.

## Run it

Use Node.js 20.9 or newer. Build the SDK packages from the repository root,
then install and run the example:

```bash
bun install
bun run build

cd examples/nextjs
npm ci
cp .env.example .env.local
npm run dev
```

Replace the placeholders in `.env.local` with a development project's secret
key, webhook secret, API URL, and a user identifier from your application's
server-side session. Register
`http://localhost:3000/api/incld/webhook` as the development webhook URL.

The playground exposes a **Sync demo actions** control for local testing.
Production deployments should run `await incld.syncActions()` from a release
task whenever declarations change.

The page deliberately mounts every public component surface: create and edit schedules, run history, approval requests and policy management, approval gates and decisions, server-created Bulk operations, and controlled Audit filters. Use it as both a copyable App Router integration and a manual SDK regression harness.

Run the complete static verification with:

```bash
npm run verify
```

This also verifies the documentation quickstart in `quickstart/`. That fixture is
the source of the code shown on the Phoenix quickstart page: it is type-checked
and built as a production App Router application so documented imports, routes,
provider setup, action declarations, and synchronization stay executable. Next.js
16 requires Node.js 20.9 or newer.

## Trust boundary

- Browser components call `/api/incld/v1` with no project key.
- `src/lib/incld.ts` resolves the authenticated user on the server and owns authorization.
- Protected identity fields supplied by the browser are discarded recursively.
- Webhook delivery has its own route and signature verification.
- Bulk creation stays server-side; the browser receives monitoring and cancellation capabilities.

Replace `INCLD_DEMO_USER_ID` with a real server-side session lookup before adapting this example to an application.
