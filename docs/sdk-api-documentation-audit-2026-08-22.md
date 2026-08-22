# SDK, API, and documentation audit

Date: 2026-08-22
Scope: public REST API, JavaScript server and browser clients, framework adapters, React packages, Go and Elixir SDKs, OpenAPI, examples, and the Phoenix documentation site.

## Executive summary

The documentation has broad product coverage, but breadth currently masks several boundary problems. A reader can discover every product area, yet still has to infer which code runs in the browser, which code must run on a trusted server, which identity fields the proxy owns, and which package exports a particular component. Component pages list families of props but are not dependable API references: several public props, styling slots, primitive exports, defaults, and behavioral constraints are absent.

The highest-risk issue is not missing explanation but incorrect executable guidance: the signed-delivery page documents `verifyWebhookSignature` as accepting an options object and returning an event. The shipped JavaScript function accepts `(payload, signature, secret, tolerance?)` and returns `Promise<boolean>`. The rewrite corrects that example.

The other release-blocking discovery was in code rather than prose: `@incld/nextjs-schedules` re-exported legacy symbols such as `ScheduleButton`, `ScheduleBuilder`, and `ScheduleHistory`, while `@incld/react-schedules` exports the current `ScheduleTrigger`, `ScheduleComposer`, and `RunHistory` API. The compatibility wrapper has now been repaired to re-export the current API and is included in workspace build, typecheck, and runtime export tests.

The docs rewrite focuses on four outcomes:

1. A new user can go from dashboard credentials to a verified Next.js integration without filling in structural gaps.
2. Every React page is a usable reference for imports, required props, optional props, defaults, callbacks, async states, styling, and browser/server constraints.
3. The REST page distinguishes the full secret-key API from the smaller same-origin browser proxy and names every authorization operation.
4. Webhook verification, action synchronization, idempotency, and identity injection match the shipped JavaScript implementation exactly.

## Method

The audit treated implementation as the source of truth and compared these layers:

- Phoenix router, API controllers, pagination, presenters, domain filters, and schemas.
- `openapi.yaml` and its route coverage test.
- `@incld/client` constructors, resources, public types, error normalization, browser proxy allowlist, context injection, framework adapters, and webhook dispatcher.
- All React provider, primitive, component, hook, utility, and package export files.
- Go and Elixir client source and package READMEs.
- Framework pages, product guides, SDK pages, API/model/webhook/error pages, search metadata, and LiveView docs tests.
- The Next.js example and compatibility wrapper packages.

This is a boundary audit, not merely an editorial review. Claims were checked against callable method signatures, route matching, request transformation, response presentation, and exported TypeScript symbols.

## The actual public boundary

### HTTP API

The full `/v1` API contains 40 method/path operations across Actions, Schedules, Runs, Approvals, Approval policies, Audit, Bulk, and Sessions. `openapi.yaml` has path/method parity with the Phoenix router, enforced by `OpenAPIContractTest`.

All direct calls use a project secret in `Authorization: Bearer …`. Collection responses use `{data, meta}` with an opaque `next_cursor`; single resources use `{data}`. Most collection limits clamp to 1–100 and default to 25 at the controller pagination layer. Run listing has equivalent 1–100 behavior implemented independently.

The full API includes two operations intentionally excluded from browsers:

- `POST /actions`: action registry synchronization is trusted server work.
- `POST /bulk-operations`: item validation and authorization must happen on the application server.

### JavaScript clients

`Incld` is the authenticated server client. It requires `apiKey`, defaults to `https://api.incld.dev`, adds `/v1` if necessary, accepts a fetch override, and defaults to a 10-second timeout.

`IncldBrowser` has no API key. It requires a same-origin relative `baseUrl`, defaults to `/api/incld`, ignores custom request headers, and calls the application-owned `/v1` proxy below that base path.

Both expose:

- `actions`
- `schedules`
- `runs`
- `approvals`
- `approvalPolicies`
- `auditEvents`
- `bulkOperations`
- `sessions`

`audit` and `bulk` remain deprecated aliases.

`RequestOptions` is `{signal?, idempotencyKey?, headers?}`. `headers` only applies to `Incld`; browser requests deliberately discard it.

### Browser proxy and trusted identity

The framework adapters recursively remove these keys from browser query/body data before forwarding:

`external_user_id`, `external_organization_id`, `requester_id`, `approver_id`, `actor_id`, `viewer_id`, `user_id`, and `organization_id`.

They then inject values derived from `resolveContext`:

- Schedule and Run reads are scoped by `external_user_id`; Schedule writes receive user and optional organization identity.
- Approval list `view=assigned` injects `approver_id`; `view=requested` or the default injects `requester_id`; `view=all` injects neither and therefore requires careful authorization.
- Approval create/check inject requester identity; decisions inject approver identity; cancel/revoke inject actor identity.
- Audit reads inject viewer identity and writes inject actor identity.
- Bulk cancellation injects actor identity.
- Session claims are merged with trusted context claims, then user and optional organization IDs overwrite browser values.

The adapter calls `authorize({context, operation, resource, request})` before forwarding. The exact operation strings are:

- `actions.read`
- `schedules.read`, `.create`, `.preview`, `.update`, `.delete`, `.control`, `.history`
- `runs.read`
- `approvals.read`, `.create`, `.check`, `.update`, `.delete`, `.decide`, `.history`
- `approval_policies.read`, `.create`, `.update`, `.delete`
- `audit.read`, `.create`
- `bulk.read`, `.cancel`
- `sessions.create`

### Framework integration and delivery

`createCoreIntegration` returns `{routes, webhook, syncActions, client}`. Next.js wraps `routes` into `{GET, POST, PATCH, DELETE}`. Express, SvelteKit, and Nuxt convert their native request types into the same Web Request boundary.

`syncActions()` upserts declared action metadata. Webhook dispatch handles `run.created` and `bulk.chunk`; other valid signed events are acknowledged without action execution. A recognized delivery for an undeclared identifier returns `422 action_not_declared`.

Action handlers receive `{action, payload, event, request, client}`. `event.idempotencyKey` is the event ID. Schedule deliveries also normalize `scheduleId` and `runId`; Bulk deliveries normalize operation/chunk IDs, chunk index, items, and metadata into `payload`.

### React packages

The shared provider is `@incld/react`. Feature packages are `@incld/react-schedules`, `@incld/react-approvals`, `@incld/react-bulk`, and `@incld/react-audit`.

All feature components use `IncldBrowser` through `IncldProvider`; consequently they require the same-origin framework proxy. They do not accept or expose a secret key.

The current public families are:

- Schedules: `ScheduleTrigger`, `ScheduleComposer`, `ScheduleList`, `ScheduleDetails`, `RunHistory`, `NextRun`; five hooks; three formatting/summary utilities.
- Approvals: request trigger/dialog, inbox, actions, timeline, details, gate, policy list/editor; approval and policy query/mutation hooks.
- Bulk: progress, operation list/details; operations, single-operation polling, chunks, events, and cancellation hooks. There is deliberately no browser create component or create mutation.
- Audit: timeline, event details, controlled/uncontrolled filters; list/get hooks. There is no React write hook.

### SDK parity

JavaScript remains the canonical browser/framework SDK. Go and Elixir now expose Schedule event history and single Run lookup in addition to their existing product services, closing the HTTP resource gaps discovered in this audit. Framework proxy construction and React support remain JavaScript-specific; Go and Elixir applications must build an application proxy if they want the shipped React components.

## Findings

### P0 — incorrect or non-compiling guidance

1. **Resolved: JavaScript webhook verification signature was wrong in docs.** The docs showed an object `{secret, toleranceSeconds}` and treated the result as a parsed event. The implementation takes the secret and tolerance as positional values and returns a boolean. Fixed in the public and package docs.
2. **Resolved: `@incld/nextjs-schedules` exported stale symbols.** It now re-exports the current React Schedules and Next.js adapter surface, with build, typecheck, and export tests in the root workspace suite.

### P1 — trust-boundary gaps

1. The browser and server clients were described on separate pages but not compared in one decision table.
2. The proxy page grouped operations, making it hard to write a correct `authorize` callback or understand which route maps to which operation.
3. Protected identity fields were mentioned selectively. The recursive removal behavior and full key list were absent.
4. `view=all` is security-sensitive because it removes requester/approver scoping; this was not called out prominently.
5. Bulk creation and Action definition are server-only, but this constraint needed to appear consistently in quickstart, SDK, REST, and React docs.
6. Browser `RequestOptions.headers` being ignored was easy to miss.

### P1 — React reference gaps

1. Provider docs omitted `className`, `style`, `variables`, `useIncldLabel`, `IncldFieldError`, and `errorMessagesFor`.
2. Only a subset of the 27 public theme variable mappings was listed.
3. Schedule docs omitted `ScheduleTrigger.dialogClassName`, `ScheduleComposer.initialSchedule`, component-level `className` in some rows, and the composer’s UI limitation to day-of-month monthly recurrences.
4. Approval component rows were summaries rather than prop references. Policy editor/list callbacks and class names, action defaults, reason behavior, and inbox view semantics needed explicit documentation.
5. Bulk docs did not clearly state that list selection returns an ID rather than an operation, or that details hard-limit chunks/events to 100 in the current hook implementation.
6. Audit docs did not distinguish all API filter fields from the three fields the rendered `AuditFilters` UI actually edits.
7. Hooks documented return method names but not their parameters or polling/refresh behavior in enough detail to implement custom UI confidently.

### P1 — onboarding gaps

1. The quickstart began with npm rather than dashboard prerequisites, so readers did not know where keys, webhook secret, component entitlement, and environment came from.
2. “Call `syncActions()` during deploy/startup” did not provide a concrete runnable mechanism or a success check.
3. Verification lacked observable expected outcomes for the proxy, action registry, schedule creation, and webhook delivery.
4. The relationship between provider `baseUrl=/api/incld` and the mounted route `/api/incld/v1/[...path]` was implicit.
5. There was no focused first-response troubleshooting ladder.

### P2 — API/reference clarity

1. REST endpoints are comprehensive, but the high-level query/filter matrix is hard to scan without expanding every endpoint.
2. The API supports schedule `action_id` filtering internally, while the JavaScript public type exposes `action` only. Documentation should teach the stable identifier and avoid relying on the undocumented internal filter.
3. Approval policy listing accepts pagination at the HTTP/JS boundary even though the domain query currently loads all policies before pagination. This is behaviorally correct but should be watched as policy counts grow.
4. `components` for Audit becomes a comma-separated value at the HTTP layer; JavaScript array serialization sends repeated parameters, while the Phoenix implementation reads a single string value. This deserves a contract test and potential implementation fix before promising multi-component filtering from JavaScript.
5. Manual Audit writes are paid-only; system lifecycle history remains readable through the entitled source component. This nuance needed one consistent explanation.

### P2 — support and package clarity

1. Svelte component packages exist in the repository but are described as unpublished/experimental. That status should remain explicit until release automation and package availability are verified.
2. **Resolved:** component prop tables are generated from exported TypeScript declarations, and the SDK test command rejects drift in the committed JSON and Markdown artifacts. Narrative examples and behavioral guidance still require review when component behavior changes.
3. All package manifests currently report `0.1.0`; public docs should avoid implying semver maturity guarantees that are not stated elsewhere.

## Documentation changes made

- Reworked the Next.js quickstart around prerequisites, exact route/base-path relationships, an explicit action-sync command, expected verification outcomes, and troubleshooting.
- Expanded provider documentation into a complete prop and primitive reference, including the full theme-variable mapping.
- Expanded each React suite with exact props, defaults, callback signatures, server/browser constraints, and implementation limits.
- Reworked the REST browser-proxy section into an exact route/operation matrix and documented recursive identity stripping and trusted injection.
- Corrected JavaScript webhook verification and separated boolean verification from JSON parsing.
- Added explicit SDK parity and browser/server availability guidance where users choose a client.
- Strengthened LiveView tests around previously omitted or incorrect contracts.

## Engineering follow-up status

The five implementation follow-ups requested from this audit are complete:

1. `@incld/nextjs-schedules` and `@incld/nextjs-approvals` re-export current server/client APIs and run in workspace build, typecheck, and tests.
2. A JavaScript contract test reads all 40 OpenAPI operations, verifies every browser-safe path's exact authorization operation, and asserts that only Action definition and Bulk creation remain server-only.
3. The Next.js quickstart is an executable App Router fixture. Phoenix embeds those exact source files in the documentation at compile time, and the example verification script both type-checks them and runs a production Next.js build.
4. React prop reference JSON and Markdown are generated from exported TypeScript interfaces. Phoenix renders the generated data, and the JavaScript test command fails when committed artifacts drift.
5. Go and Elixir now expose Schedule event history and single Run lookup, with transport-level tests and updated documentation.

Additional non-blocking improvements remain available: contract-test Audit multi-component encoding separately, formalize package support status as structured metadata, return richer synchronization results from `syncActions()`, and consider a higher-level parsed-event webhook helper while retaining the low-level boolean verifier.

## Definition of done for future documentation releases

A documentation release should not be considered complete unless:

- Every public route is represented in OpenAPI and REST reference.
- Every browser-allowed route has an authorization operation and identity-injection test.
- Every exported component has a complete prop table and at least one compiling example.
- Every copied SDK example type-checks or compiles in CI.
- Server-only operations are marked in every place they appear.
- Webhook examples verify the raw body with the exact shipped signature.
- SDK parity differences are visible before installation.
- Pricing/entitlement language comes from the canonical component catalog.
