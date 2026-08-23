# @incld/react-bulk

React monitoring, progress, cancellation, and inspection components for server-created Bulk operations.

Mounted operation lists, details, chunks, and events automatically refresh using the provider interval (five seconds by default), pause in hidden tabs, and refresh when the tab becomes visible again. Active operation progress retains its faster two-second poll and stops at a terminal state.

```bash
npm install @incld/client @incld/react @incld/react-bulk
```

Bulk creation is intentionally excluded from the browser proxy. Validate the items and authorization in trusted server code:

```ts
const tenantIncld = new Incld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  scope: {organizationId: session.organization.id},
});

const operation = await tenantIncld.bulkOperations.create({
  action: 'sync_contacts',
  items: contacts.map(contact => ({id: contact.id})),
  chunkSize: 250,
  metadata: {importId},
}, {idempotencyKey: `contacts:${importId}`});
```

Derive the organization from the authenticated server session, never the request body. Scoping the client ensures direct-ID reads and mutations remain inside that organization too. Then render browser monitoring UI inside `IncldProvider`:

```tsx
import {BulkOperationDetails, BulkOperationList} from '@incld/react-bulk';
import '@incld/react-bulk/styles.css';

<BulkOperationList onSelect={setOperationId} />
{operationId && <BulkOperationDetails operationId={operationId} />}
```

## Components

| Component | Props and behavior |
| --- | --- |
| `BulkProgress` | Supply `operationId?` or `operation?`; `cancellable=false`, `onCancelled?`, `className?`, `loading?`, `error?`. Passing an operation avoids the initial fetch. Polls non-terminal operations and renders counts/percentage. |
| `BulkOperationList` | `filters?: ListBulkOperationsParams`, `onSelect?(id)`, `className?`, `loading?`, `empty?`, `error?`. The selection callback receives the string ID. |
| `BulkOperationDetails` | Required `operationId`; optional `className`. Composes cancellable progress, first 100 chunks, and first 100 lifecycle events. |

Current terminal states are `succeeded`, `completed_with_errors`, and `cancelled`. Polling stops in any terminal state. Cancellation prevents new queued chunks; work already running may finish.

## Hooks

- `useBulkOperations(params?)` lists by action, status, limit, and cursor.
- `useBulkOperation(id?, pollInterval=2000)` adds a faster active-operation poll while the document is visible and the operation is not terminal; shared provider refresh still keeps the surrounding list and inspection data current.
- `useBulkChunks(id?)` and `useBulkEvents(id?)` load the first 100 inspection records.
- `useBulkOperationMutation()` returns `{cancel(id, reason?), pending, error}`.

There is no React creation hook or component. Use the trusted `Incld` client, then pass the resulting operation ID to the UI.
