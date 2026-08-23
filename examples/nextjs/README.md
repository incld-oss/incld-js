# incld Next.js reference

This app is the copyable reference for the supported React components and Next.js App Router integration. It demonstrates one browser provider, a same-origin allowlisted proxy, server-owned identity, a separate signed webhook, and server-initiated bulk work.

## Run it

Initialize Phoenix once with `just setup` (or use `just reset` when you want a
clean database). Then, from the repository root, reconcile the demo, build the
local packages, configure the server integration, and start the example:

```bash
just next-setup
just next-dev
```

Run `just dev` in a second terminal for the Phoenix API. The checked-in
`.env.example` contains the deterministic credentials created by `just setup` or
`just reset`; they are intentionally local-only and must not be deployed. The
default local API is `http://localhost:4000`; override `INCLD_API_URL` for another
environment. Register the webhook URL as
`http://localhost:3000/api/incld/webhook`.

The playground exposes a **Sync demo actions** control for local testing. With
both servers running, the same operation is available from the terminal as
`just sync-actions`. Production deployments should run
`await incld.syncActions()` from a release task whenever declarations change.

The page deliberately mounts every public component surface: create and edit schedules, run history, approval requests and policy management, approval gates and decisions, server-created Bulk operations, and controlled Audit filters. Use it as both a copyable App Router integration and a manual SDK regression harness.

Run the complete static verification with:

```bash
just next-verify
```

This also verifies the documentation quickstart in `quickstart/`. That fixture is
the source of the code shown on the Phoenix quickstart page: it is type-checked
and built as a production App Router application so documented imports, routes,
provider setup, action declarations, and synchronization stay executable. Next.js
16 requires Node.js 20.9 or newer.

## Trust boundary

- Browser components call `/api/incld/v1` with no project key.
- `src/lib/incld.ts` resolves the authenticated user and active organization on the server and owns authorization.
- Protected identity fields supplied by the browser are discarded recursively.
- The proxy requires both identities, and the API enforces the organization boundary on every tenant-bound query and mutation.
- Webhook delivery has its own route and signature verification.
- Bulk creation stays server-side; the browser receives monitoring and cancellation capabilities.
- Server-side tenant jobs construct a scoped client, so list, direct-ID, and mutation requests all retain the same organization boundary.

Replace `INCLD_DEMO_USER_ID` and `INCLD_DEMO_ORGANIZATION_ID` with a real server-side session and active-organization lookup before adapting this example to an application. Never accept the organization ID directly from browser request data.
