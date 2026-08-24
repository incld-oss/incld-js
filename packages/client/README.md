# @incld/client

The JavaScript/TypeScript SDK for the incld v1 API. It contains two deliberately different clients:

- `Incld` is the trusted-server client. It requires a project secret key; unscoped instances can call the complete project API, while scoped instances are deliberately tenant-constrained.
- `IncldBrowser` is credential-free and same-origin only. It calls a framework proxy in your application, which authenticates the current user and supplies trusted identity.

It also exports Next.js, Express, SvelteKit, and Nuxt adapters, action definitions, webhook dispatch, public model types, and structured errors.

## Install

```bash
npm install @incld/client
```

## Server client

```ts
import {Incld} from '@incld/client';

const incld = new Incld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  baseUrl: 'https://api.incld.dev', // optional default
  timeoutMs: 10_000,               // optional default
  fetch: globalThis.fetch,         // optional override
  scope: {                         // recommended for tenant request paths
    organizationId: session.organization.id,
    userId: session.user.id,
  },
});

const schedule = await incld.schedules.create({
  action: 'sync_contacts',
  recurrence: {
    frequency: 'daily', interval: 1, localTime: '09:00',
    timezone: 'Australia/Melbourne',
  },
  timezone: 'Australia/Melbourne',
}, {idempotencyKey: 'schedule:org_123:user_123:sync_contacts'});
```

Never instantiate `Incld` in browser code. An unscoped instance is an explicit project administrator client. Set `scope.organizationId` for organization-wide server work and add `scope.userId` for end-user request paths; protected scope headers then constrain list and ID-based API operations independently of request filters.
Project-wide action definition requires an unscoped administrator client. Keep that client in a deployment or startup synchronization task, not a tenant request path.

## Browser client

```ts
import {IncldBrowser} from '@incld/client';

const incld = new IncldBrowser({baseUrl: '/api/incld'});
const page = await incld.schedules.list({status: 'active'});
```

`IncldBrowser` rejects absolute URLs, accepts no API key, and ignores `RequestOptions.headers`. The client appends `/v1` when the base URL does not already end in `/v1`, so `/api/incld` maps to an application route under `/api/incld/v1/*`.

The browser proxy does not expose `actions.define`, `auditEvents.tombstone`, or `bulkOperations.create`. Perform them with `Incld` on a trusted server. Every Approval Policy operation and Bulk read is denied unless the adapter's `authorize` callback explicitly permits it.

## Resources

| Property | Methods |
| --- | --- |
| `actions` | `list`, `get`, `define` (server only) |
| `schedules` | `list`, `get`, `create`, `update`, `remove`, `preview`, `pause`, `resume`, `runs`, `events` |
| `runs` | `list`, `get` |
| `approvals` | `list`, `get`, `check`, `create`, `update`, `decide`, `approve`, `reject`, `cancel`, `revoke`, `events`, `remove` |
| `approvalPolicies` | `list`, `get`, `create`, `update`, `remove`; explicit proxy authorization required |
| `auditEvents` | `list`, `get`, `create`, `tombstone` (server only) |
| `bulkOperations` | `list`, `get`, `create` (server only), `chunks`, `events`, `cancel` |
| `sessions` | `create` |

`audit` and `bulk` are deprecated aliases for `auditEvents` and `bulkOperations`.

List methods return `Page<T>` with `data` and `meta: {nextCursor, hasMore}`. Pass `nextCursor` back unchanged. SDK values use camelCase; the client maps to the REST API's snake_case wire format.

Every request accepts:

```ts
interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  headers?: Record<string, string>; // Incld only; ignored by IncldBrowser
}
```

## Next.js App Router integration

Keep the integration in a server-only module:

```ts
import 'server-only';
import {createIncld, defineActions} from '@incld/client/next';

export const incld = createIncld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  webhookSecret: process.env.INCLD_WEBHOOK_SECRET!,
  async resolveContext(request) {
    const session = await sessionFromRequest(request);
    if (!session?.organizationId) return null;
    return {
      user: {id: session.user.id},
      organization: {id: session.organizationId},
      permissions: session.permissions,
    };
  },
  async authorize({context, operation, resource, request}) {
    return canUseIncld(context, operation, resource, request);
  },
  actions: defineActions({
    sync_contacts: {
      displayName: 'Sync contacts',
      payloadSchema: {type: 'object', properties: {segment: {type: 'string'}}},
      async run({payload, event}) {
        await syncContacts(payload, event.idempotencyKey);
      },
    },
  }),
});
```

Mount proxy and webhook routes separately:

```ts
// app/api/incld/v1/[...path]/route.ts
import {incld} from '@/lib/incld';
export const {GET, POST, PATCH, DELETE} = incld.routes;

// app/api/incld/webhook/route.ts
import {incld} from '@/lib/incld';
export const POST = incld.webhook;
```

Run `await incld.syncActions()` from a deployment/startup task after the new code is available. Synchronization is an idempotent upsert. `createIncld` returns `{routes, webhook, syncActions, client}`. Express, SvelteKit, and Nuxt exports wrap the same core boundary.

## Proxy authorization and identity

`authorize` receives one of these exact operation strings:

```text
actions.read
schedules.read | schedules.create | schedules.preview | schedules.update
schedules.delete | schedules.control | schedules.history
runs.read
approvals.read | approvals.create | approvals.check | approvals.update
approvals.delete | approvals.decide | approvals.history
approval_policies.read | approval_policies.create | approval_policies.update | approval_policies.delete
audit.read | audit.create
bulk.read | bulk.cancel
sessions.create
```

The proxy recursively removes browser-supplied `external_user_id`, `external_organization_id`, `requester_id`, `approver_id`, `actor_id`, `viewer_id`, `user_id`, and `organization_id`. It requires a trusted organization for every tenant-bound operation, injects organization and user identity from `resolveContext`, and sends protected scope headers that the platform enforces on list, lookup, mutation, history, and idempotency paths.

Bulk reads and every approval-policy operation require an explicit `authorize` callback. Action synchronization and Bulk creation are server-only operations.

Approval lists default to the requester's view. `view: 'assigned'` scopes by approver. Even `view: 'all'` remains constrained to the trusted organization and approvals in which the current user participates.

## Action delivery

The framework webhook dispatches `run.created` and `bulk.chunk` to the matching declared action. Handlers receive `{action, payload, event, request, client}`. `event` includes `idempotencyKey`, trusted organization context, and, for schedule delivery, user context plus optional `scheduleId` and `runId`. The supplied follow-up `client` is automatically scoped from that durable context. Persist the idempotency key before external side effects, and route work using `event.context.organization_id`. A recognized delivery with no declaration returns `422 action_not_declared`.

For manual verification, preserve the exact raw body. The low-level function returns a boolean:

```ts
import {verifyWebhookSignature} from '@incld/client';

const valid = await verifyWebhookSignature(rawBody, signature, webhookSecret, 300);
if (!valid) throw new Error('Invalid incld signature');
const event = JSON.parse(rawBody);
```

## Errors

API failures throw `IncldError` with `status`, `code`, `message`, optional validation `fields`, and optional `requestId`. Specialized subclasses are `AuthenticationError`, `ForbiddenError`, `NotFoundError`, and `ValidationError`. Network, timeout, and caller abort failures remain transport errors.
