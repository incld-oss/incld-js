# SDK and component product contract

Status: implemented; maintained as the public contract
Date: 2026-08-20
Scope: REST API, JavaScript server/browser SDKs, backend framework adapters, React components, Go and Elixir clients

## Decision

The existing SDKs are prototypes, not release candidates. Their resource coverage is useful, but the public contracts are inconsistent enough that preserving compatibility would cost more than a clean pre-release redesign.

We will keep the domain implementation and rewrite the integration surface around it. The first supported release will provide:

- a stable REST API with one envelope, error, pagination, identity, and action-reference model;
- an authenticated server client and an unauthenticated browser client with different constructors;
- framework adapters that resolve trusted application context, allowlist proxy operations, strip client-supplied identity, and dispatch signed action webhooks;
- a single React provider and accessible, styled component families for schedules, approvals, audit, and bulk progress;
- server-client parity for Go and Elixir;
- Next.js, Express, SvelteKit, and Nuxt backend integrations.

React is the GA component runtime. The current Svelte components are not release-ready and will remain explicitly experimental until they share this contract and have interaction tests. The component-specific Next.js packages are compatibility wrappers only: they re-export the React component surface and the Next.js server adapter without defining a second API.

## Current readiness

| Surface | Readiness before redesign | Main blockers |
| --- | ---: | --- |
| REST API | alpha, 60% | internal IDs leak into commands, inconsistent pagination and presentation, flat errors |
| JavaScript client | alpha, 55% | server/browser security boundary is unclear, mixed naming, weak request controls |
| Framework adapters | prototype, 35% | proxy and webhook concerns are conflated, identity fields overlap, route forwarding is too permissive |
| React components | prototype, 30% | three incompatible providers, identity accepted from the browser, arbitrary theme maps, disabled tests |
| Svelte components | prototype, 20% | duplicated providers, no supported test/typecheck contract, not behaviorally aligned with React |
| Go and Elixir clients | alpha, 50% | response/error/action-reference parity is incomplete |

“Ready to go to market” means the public contracts below are implemented, documented, covered by request/interaction tests, and exercised by a working example. Visual completeness alone is not a release gate.

## Product invariants

1. **The browser is untrusted.** A browser may describe a resource or desired action, but it may not choose the authenticated user, organization, requester, approver, actor, or audit viewer.
2. **Identifiers are stable.** Public commands reference declared actions by `identifier`; database UUIDs remain implementation details.
3. **One concept has one name.** JavaScript uses camelCase. REST JSON uses snake_case. SDKs perform the translation at the boundary.
4. **Components are useful out of the box.** Every component has styled light/dark defaults, keyboard behavior, focus treatment, loading/empty/error states, and overridable slots.
5. **Components do not authorize.** `ApprovalGate` changes presentation only. The application must enforce authorization on its server.
6. **Mutations are observable and safe to retry.** Create/decision commands accept an idempotency key and expose pending, success, and failure outcomes.
7. **Framework adapters fail closed.** They proxy only documented methods and paths and reject unresolved application context.

## Package topology

### Supported packages

- `@incld/client`
  - `Incld`: authenticated server client.
  - `IncldBrowser`: relative-URL browser client with no API-key option.
  - resource types, errors, pagination, and webhook verification primitives.
  - subpath exports: `@incld/client/next`, `/express`, `/sveltekit`, `/nuxt`.
- `@incld/react`
  - the single `IncldProvider`, shared theme, status primitives, and low-level hooks.
- `@incld/react-schedules`
- `@incld/react-approvals`
- `@incld/react-audit` (renamed from `@incld/audit` before first release)
- `@incld/react-bulk`
- `@incld/nextjs-schedules` and `@incld/nextjs-approvals`
  - compatibility entry points for existing Next.js consumers;
  - re-export the current `@incld/react-*` component API, `IncldProvider`, and `@incld/client/next` server helpers;
  - add no runtime behavior of their own.
- `github.com/incld-dev/incld-go`
- `hex.pm/packages/incld`

### Retired before first release

- feature-local React providers.
- browser constructors that accept a bearer credential, including the placeholder `"client"` token.

### Experimental

- `@incld/svelte-schedules` and `@incld/svelte-approvals` remain unpublished workspace prototypes until they implement the same behavior, theme variables, and interaction suite. Backend SvelteKit support is unaffected.

## REST API contract

The base path is `/v1`. API-key clients send `Authorization: Bearer <key>`. Browser requests go to an application-owned proxy and never receive the key.

### Envelopes

Single resource and command result:

```json
{"data":{"id":"…"}}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "next_cursor": null,
    "has_more": false
  }
}
```

Error:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request could not be validated.",
    "fields": {"expression":["is invalid"]},
    "request_id": "req_…"
  }
}
```

Error codes are stable machine values. HTTP status communicates the broad class. Messages are safe for end users; field details contain validation feedback.

### Pagination and request controls

All collection endpoints accept `limit` (default 25, maximum 100) and `cursor`. Filters remain resource-specific. SDK list methods return `Page<T>`, never a bare array.

All network methods accept transport options. Create and irreversible command methods additionally accept `idempotencyKey`, sent as `Idempotency-Key`. `AbortSignal` is supported in JavaScript. The response request ID is attached to SDK errors.

### Identity

Direct server-to-server calls may supply identity fields documented for the resource. Browser proxy requests may not. The proxy derives these fields from trusted application context:

- schedule owner and audit viewer: `context.user.id`;
- approval requester: `context.user.id`;
- approval decision approver: `context.user.id`;
- audit actor for user-originated events: `context.user.id`;
- organization scope: `context.organization.id` when present.

Client-supplied identity fields are removed rather than merged. The proxy returns `401 context_required` if no context can be resolved and `403 context_forbidden` when an adapter policy denies a request.

### Actions

Actions are declared by a stable identifier:

```json
{
  "identifier": "sync_contacts",
  "display_name": "Sync contacts",
  "description": "Refresh the CRM contact index",
  "payload_schema": {"type":"object"}
}
```

Schedule create/update requests use `action`, not `action_id`:

```json
{
  "action": "sync_contacts",
  "expression": "0 9 * * 1-5",
  "timezone": "Australia/Melbourne",
  "payload": {"segment":"active"},
  "overlap_policy": "skip"
}
```

The API resolves the identifier to its internal action row. Responses expose a compact action object:

```json
{"action":{"identifier":"sync_contacts","display_name":"Sync contacts"}}
```

Bulk operations likewise use the action identifier. No public command requires an action UUID.

### Resource routes

| Resource | Routes |
| --- | --- |
| actions | `GET/POST /actions`, `GET /actions/:identifier` |
| schedules | `GET/POST /schedules`, `GET/PATCH/DELETE /schedules/:id`, `POST /schedules/preview`, `POST /schedules/:id/pause`, `POST /schedules/:id/resume`, `GET /schedules/:id/runs`, `GET /schedules/:id/events` |
| runs | `GET /runs`, `GET /runs/:id` |
| approvals | `GET/POST /approvals`, `GET/PATCH/DELETE /approvals/:id`, `POST /approvals/check`, `POST /approvals/:id/decisions`, `POST /approvals/:id/cancel`, `POST /approvals/:id/revoke`, `GET /approvals/:id/events` |
| approval policies | `GET/POST /approval-policies`, `GET/PATCH/DELETE /approval-policies/:id` |
| audit | `GET/POST /audit-events`, `GET /audit-events/:id` |
| bulk | `GET/POST /bulk-operations`, `GET /bulk-operations/:id`, `GET /bulk-operations/:id/chunks`, `GET /bulk-operations/:id/events`, `POST /bulk-operations/:id/cancel` |
| sessions | `POST /sessions` |

`POST /approvals/:id/approve` and `/reject` become convenience SDK calls over the canonical `/decisions` endpoint; they are not separate concepts in the public REST contract.

## JavaScript client interface

### Construction

```ts
import { Incld } from "@incld/client"

const incld = new Incld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  baseUrl: "https://api.incld.dev",
  timeoutMs: 10_000,
})
```

```ts
import { IncldBrowser } from "@incld/client"

const incld = new IncldBrowser({baseUrl: "/api/incld"})
```

The browser type has no credential field and cannot target a cross-origin URL by default.

### Shared transport types

```ts
interface RequestOptions {
  signal?: AbortSignal
  idempotencyKey?: string
  headers?: Record<string, string> // server client only
}

interface Page<T> {
  data: T[]
  meta: {nextCursor: string | null; hasMore: boolean}
}

class IncldError extends Error {
  code: string
  status: number
  fields?: Record<string, string[]>
  requestId?: string
}
```

### Resource methods

```ts
incld.actions.list(params?, options?)
incld.actions.get(identifier, options?)
incld.actions.define(input, options?)

incld.schedules.list(params?, options?)
incld.schedules.get(id, options?)
incld.schedules.create(input, options?)
incld.schedules.update(id, input, options?)
incld.schedules.remove(id, options?)
incld.schedules.preview(input, options?)
incld.schedules.pause(id, options?)
incld.schedules.resume(id, options?)
incld.schedules.runs(id, params?, options?)
incld.schedules.events(id, params?, options?)

incld.runs.list(params?, options?)
incld.runs.get(id, options?)

incld.approvals.list(params?, options?)
incld.approvals.get(id, options?)
incld.approvals.check(input, options?)
incld.approvals.create(input, options?)
incld.approvals.update(id, input, options?)
incld.approvals.decide(id, {decision, reason?}, options?)
incld.approvals.approve(id, reason?, options?)
incld.approvals.reject(id, reason?, options?)
incld.approvals.cancel(id, reason?, options?)
incld.approvals.revoke(id, reason?, options?)
incld.approvals.events(id, params?, options?)

incld.approvalPolicies.list/create/get/update/remove
incld.auditEvents.list/get/create
incld.bulkOperations.list/get/create/chunks/events/cancel
incld.sessions.create(input, options?)
```

Inputs never mix camelCase and snake_case. Returned objects are camelCase. Dates remain ISO-8601 strings so serialization is lossless and framework-neutral.

## Backend framework integration

### Application context

```ts
interface IncldContext {
  user: {id: string}
  organization?: {id: string}
  roles?: string[]
  permissions?: string[]
  claims?: Record<string, unknown>
}
```

There are no `requesterId`, `approverId`, `actorId`, or `viewerId` alternatives. Resource operations derive the appropriate role from `user.id`.

### Action declarations

```ts
const actions = defineActions({
  sync_contacts: {
    displayName: "Sync contacts",
    description: "Refresh the CRM contact index",
    payloadSchema: {
      type: "object",
      properties: {segment: {type: "string"}},
      required: ["segment"],
    },
    async run({payload, event}) {
      // event.idempotencyKey, event.scheduleId, event.runId, event.context
    },
  },
})
```

### Adapter shape

Every framework adapter exposes the same conceptual operations:

```ts
const incld = createIncld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  webhookSecret: process.env.INCLD_WEBHOOK_SECRET!,
  actions,
  async resolveContext(request): Promise<IncldContext | null> {
    return contextFromApplicationSession(request)
  },
  async authorize({context, operation, resource}) {
    return true
  },
})
```

- `routes`: an application-facing proxy handler for browser components.
- `webhook`: a platform-facing signed webhook handler for declared actions.
- `syncActions`: an explicit deployment/startup sync function.

For Next.js App Router:

```ts
// app/api/incld/v1/[...incld]/route.ts
export const {GET, POST, PATCH, DELETE} = incld.routes

// app/api/incld/webhook/route.ts
export const POST = incld.webhook
```

Express, SvelteKit, and Nuxt adapters expose equivalent handlers in their native signatures. Proxy and webhook routes are deliberately separate. Action synchronization is explicit and idempotent; the webhook path never doubles as a browser route.

The proxy has a static operation table. Unknown paths, methods, cross-origin destinations, and attempts to send authorization headers are rejected. The adapter injects trusted identity after recursively removing protected fields from query and body input.

## React foundation

### Provider

```tsx
<IncldProvider
  client={new IncldBrowser({baseUrl: "/api/incld"})}
  appearance={{
    colorScheme: "system", // light | dark | system
    accentColor: "indigo",
    radius: "medium",
    density: "comfortable",
  }}
  labels={{optional: "Optional"}}
  onError={(error) => reportError(error)}
>
  {children}
</IncldProvider>
```

Only one provider is needed for every feature. It supplies the browser client, appearance, localized labels, and the default error reporter. It does not receive identity.

Theme customization uses documented CSS variables prefixed `--incld-` plus the small appearance object above. Components support `className`, `classNames` keyed by documented slots, and `unstyled`. They do not accept an unlimited theme-property map.

### Common behavior

Every data component supports:

```ts
interface AsyncViewProps {
  loading?: ReactNode
  empty?: ReactNode
  error?: (error: IncldError, retry: () => void) => ReactNode
}
```

Mutation components expose `onSuccess`, `onError`, and controlled/open-state callbacks where applicable. Buttons disable while pending and keep their label width stable. Dialogs trap focus, close on Escape when safe, restore focus to their trigger, and announce errors. Dates use `Intl` and accept `locale` and `timeZone` presentation overrides. Destructive actions require confirmation.

## React component families

### Schedules

#### `ScheduleTrigger`

Renders a button that opens `ScheduleComposer`. Props: `action`, `defaultPayload`, `defaultSchedule`, `children`, `onCreated`, dialog props, and standard button props. It never accepts a user ID.

#### `ScheduleComposer`

A complete create/edit experience with human presets and an advanced expression mode. Props:

```ts
interface ScheduleComposerProps {
  action: string
  payload?: unknown
  scheduleId?: string
  defaultValue?: Partial<ScheduleInput>
  mode?: "create" | "edit"
  onSaved?: (schedule: Schedule) => void
  onCancel?: () => void
  className?: string
  classNames?: ScheduleComposerSlots
  unstyled?: boolean
}
```

It validates locally, calls preview after a short debounce, shows the next five occurrences, supports timezone search, explains overlap policies, and requires explicit confirmation before replacing an existing schedule.

#### `ScheduleList`

Paginated list with status/action filters and optional selection. Props: `filters`, `pageSize`, `renderItem`, `onSelect`, async-view props. Default rows show action, humanized cadence, timezone, next run, status, and an overflow menu.

#### `ScheduleDetails`

Summary and controls for one schedule. Props: `scheduleId`, `onUpdated`, `onDeleted`. Pause/resume are immediate optimistic mutations with rollback; delete requires confirmation.

#### `RunHistory`

Cursor-paginated execution history for `scheduleId` or global filters. Rows expose status, attempt, start/duration, and safe error summary. Selecting a row reveals details.

#### `NextRun`

Compact live presentation of the next occurrence. Props: `scheduleId` or a `schedule`, `format` (`relative`, `absolute`, `both`), locale/timezone options.

Hooks: `useSchedules`, `useSchedule`, `useSchedulePreview`, `useRuns`, and `useScheduleMutation`. Hooks return `{data, error, status, refresh}` and mutation-specific methods; they do not hide errors in console output.

### Approvals

#### `ApprovalRequestTrigger` and `ApprovalRequestDialog`

Create an approval for a resource. Props describe resource identity and request content, not requester identity:

```ts
interface ApprovalRequestInput {
  policy?: string
  resourceType: string
  resourceId: string
  action: string
  title?: string
  description?: string
  metadata?: Record<string, unknown>
}
```

The dialog explains who/what will be affected, supports an optional note, and reports duplicate/idempotent results clearly.

#### `ApprovalInbox`

Paginated approval work queue. Props: `view` (`assigned`, `requested`, `all`), filters, `pageSize`, `renderItem`, `onSelect`, async-view props. `all` is permitted only when the adapter authorization policy allows it.

#### `ApprovalDetails`

Header, resource context, policy snapshot, current decision state, and timeline. Props: `approvalId`, visibility flags, callbacks. It composes `ApprovalActions` and `ApprovalTimeline` by default.

#### `ApprovalActions`

Approve/reject controls with reason capture and confirmation. It receives only `approvalId`; the proxy supplies the approver. Props can restrict visible actions for presentation, but server authorization remains authoritative.

#### `ApprovalTimeline`

Ordered event history with semantic icons, actor labels supplied by API display fields, and accessible timestamps.

#### `ApprovalGate`

Fetches a check and renders `children`, `fallback`, or `pending`. Props: `resourceType`, `resourceId`, `action`, `refreshOnFocus`. Its documentation must state that it is a UX convenience, not an authorization boundary.

#### `ApprovalPolicyList` and `ApprovalPolicyEditor`

Administrative policy browse/edit surfaces. The editor uses structured rule controls for supported policy types and offers JSON only as an advanced escape hatch.

Hooks: `useApprovals`, `useApproval`, `useApprovalCheck`, `useApprovalMutation`, and `useApprovalPolicies`.

### Audit

#### `AuditTimeline`

Cursor-paginated event timeline with filters for date, actor, action, resource, and outcome. It replaces `AuditTrail`. It never accepts a viewer ID.

#### `AuditEventDetails`

Displays normalized event context and a safe, collapsed JSON diff. Sensitive metadata is redacted server-side, not by the component.

#### `AuditFilters`

Controlled or uncontrolled filter bar that can be composed with `AuditTimeline`.

Hooks: `useAuditEvents` and `useAuditEvent`.

### Bulk operations

#### `BulkProgress`

Progress summary for one operation with processed/succeeded/failed counts, state, and optional cancel control. It uses polling with visibility-aware backoff until the operation reaches a terminal state.

#### `BulkOperationDetails`

Composes progress, chunk history, and event timeline. Browser components inspect and cancel operations but do not submit arbitrary work-item payloads; creation remains a server operation.

#### `BulkOperationList`

Paginated operational history with action/status filters.

Hooks: `useBulkOperations`, `useBulkOperation`, and `useBulkOperationMutation`.

## Visual language

The default UI is quiet operational software rather than a marketing widget:

- neutral layered surfaces, one configurable accent, high-contrast semantic states;
- 14px body type, tabular numerals for timestamps and counters, restrained shadows;
- minimum 40px interactive targets and visible `:focus-visible` rings;
- cards at narrow widths, dense rows from 720px upward;
- motion limited to 120–200ms opacity/transform transitions and disabled for `prefers-reduced-motion`;
- no external fonts, icon scripts, runtime stylesheets, or global resets.

CSS variables form the stable theme API: colors, typography, radii, shadows, spacing, focus ring, and z-index layers. Component slot names are stable; internal DOM structure is not.

## Accessibility and testing contract

- WCAG 2.2 AA contrast and keyboard operation are release requirements.
- Icon-only controls have accessible names; status is never conveyed by color alone.
- Async updates use appropriate live regions without repeatedly announcing polling.
- Component tests cover default, loading, empty, error/retry, keyboard, mutation, and narrow viewport states.
- Contract tests run the same fixture cases through REST and JavaScript/Go/Elixir decoding.
- The Next.js example is an end-to-end acceptance app, not a second copy of SDK source.

## Migration and implementation order

There is no production compatibility obligation. Implementation proceeds as one pre-release contract change:

1. normalize API envelopes, errors, pagination, action identifiers, and idempotency headers;
2. rewrite `@incld/client` transport/types/resources and add the browser client;
3. split framework proxy and webhook handlers and enforce trusted context;
4. introduce `@incld/react`, then rewrite feature components against it;
5. add audit and bulk React families, remove redundant Next wrappers from the supported workspace;
6. align Go and Elixir decoding and schedule inputs;
7. replace vendored example SDK copies with workspace packages and run contract, component, example, release, and precommit verification.

## Release gates

The SDKs/components can be called market-ready only when:

- no browser API accepts or transmits a trusted identity field;
- no schedule command requires an action UUID;
- all list methods return the same pagination model;
- all errors decode to the same typed shape with request IDs;
- framework proxy path/method and context tests pass;
- React has one provider and enabled tests for all public families;
- the example exercises schedule creation, an approval decision, audit browsing, bulk progress, and signed action delivery;
- JavaScript, Go, Elixir, Phoenix, OpenAPI, Next.js, release, and container checks pass.
