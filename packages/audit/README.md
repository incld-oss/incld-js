# @incld/react-audit

React components and read hooks for a viewer-scoped chronological trail of Incld lifecycle events and application events. Audit is not available on Developer; it becomes available when any paid component is active.

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

Viewer and event actor identity are bound by the trusted proxy and are never component props.

## Components

| Component | Props and behavior |
| --- | --- |
| `AuditFilters` | `value?`, `defaultValue?`, `onChange?(filters)`, `className?`. Controlled when `value` exists; otherwise initialized from `defaultValue`. The rendered UI edits `component`, `typePrefix`, and `since`, plus Clear. |
| `AuditTimeline` | `filters?`, `pageSize=25`, `onSelect?(event)`, `renderItem?(event)`, `className?`, and `loading`/`empty`/`error` renderers. |
| `AuditEventDetails` | Supply `event?` or `eventId?`; `className?`, `loading?`, `error?`. Passing the event avoids a request. |

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

Manual events are append-only. Record a correction as a new event rather than modifying history.
