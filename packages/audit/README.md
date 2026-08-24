# @incld/react-audit

React components and read hooks for a viewer-scoped chronological trail of Incld lifecycle events and application events. Audit is not available on Developer; it becomes available when any paid component is active.

Mounted timelines and event details automatically refresh using the provider interval (five seconds by default), pause in hidden tabs, and refresh when the tab becomes visible again.

```bash
npm install @incld/client @incld/react @incld/react-audit
```

```tsx
import {AuditEventDetails, AuditFilters, AuditTimeline} from '@incld/react-audit';
import '@incld/react-audit/styles.css';

<AuditFilters value={filters} onChange={setFilters} />
<AuditTimeline filters={filters} onSelect={setEvent} />
{event && <AuditEventDetails event={event} />}
```

Timeline rows preserve the full event namespace (for example, `approval.requested` is shown as “approval requested”) and include the actor, subject, and component as context. The details view also exposes the source, visibility, and structured event payload.

Viewer and event actor identity are bound by the trusted proxy and are never component props.

## Components

| Component | Props and behavior |
| --- | --- |
| `AuditFilters` | `value?`, `defaultValue?`, `onChange?(filters)`, `className?`. Controlled when `value` exists; otherwise initialized from `defaultValue`. The rendered UI edits `component`, `typePrefix`, and `since`, plus Clear. |
| `AuditTimeline` | `filters?`, `pageSize=25`, `onSelect?(event)`, `renderItem?(event)`, `className?`, and `loading`/`empty`/`error` renderers. Default rows show the full event type plus actor, subject, component, and time. |
| `AuditEventDetails` | Supply `event?` or `eventId?`; `className?`, `loading?`, `error?`. Passing the event avoids a request. Shows the event namespace, actor, subject, source, visibility, and expandable payload. |

`ListAuditEventsParams` accepts `component`, `components`, exact `type`, `typePrefix`, `actorId`, `subjectType`, `subjectId`, `viewerId`, `since`, `until`, `limit`, and `cursor`. The `AuditFilters` component only renders the subset described above; build custom controls for the remaining fields.

`actorId` and `viewerId` are valid trusted-server filters. Browser proxy requests overwrite viewer identity from the session and actor identity for writes.

## Hooks and writes

- `useAuditEvents(params?)` returns async `Page<AuditEvent>`.
- `useAuditEvent(id?)` returns async `AuditEvent | undefined`.

There is no React mutation hook. For a browser-authorized manual event, call `useIncld().client.auditEvents.create(input)`. For server outcomes, prefer the trusted server client:

```ts
const tenantIncld = new Incld({
  apiKey: process.env.INCLD_SECRET_KEY!,
  scope: {organizationId: organization.id, userId: user.id},
});

await tenantIncld.auditEvents.create({
  type: 'report.exported',
  subjectType: 'report',
  subjectId: report.id,
  visibility: 'participants',
  participantIds: report.viewerIds,
  data: {format: 'pdf'},
}, {idempotencyKey: `report-exported:${exportId}`});
```

Normal event history is append-only. Record a correction as a new event rather than modifying history. For PII erasure, call the trusted-server-only `auditEvents.tombstone(id, {reason, actorId?})`; it scrubs identity, viewer, idempotency, and payload fields, preserves the event envelope, and appends an accountable tombstone record. The detail component labels tombstoned events and does not expose erased data.
