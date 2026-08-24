import React, {useState, type ReactNode} from 'react';
import type {AuditEvent, ListAuditEventsParams} from '@incld/client';
import {IncldEmptyState, IncldErrorState, IncldSpinner, type AsyncViewProps} from '@incld/react';
import {useAuditEvent, useAuditEvents} from './hooks.js';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'medium'}).format(new Date(value));
const label = (value: string) => value.replaceAll('.', ' ').replaceAll('_', ' ');
const subjectLabel = (event: AuditEvent) => {
  if (event.subjectType && event.subjectId) return `${event.subjectType} / ${event.subjectId}`;
  return event.subjectType ?? event.subjectId;
};

export interface AuditTimelineProps extends AsyncViewProps {
  filters?: ListAuditEventsParams; pageSize?: number; onSelect?: (event: AuditEvent) => void;
  renderItem?: (event: AuditEvent) => ReactNode; className?: string;
}
export function AuditTimeline({filters = {}, pageSize = 25, onSelect, renderItem, className = '', loading, empty, error}: AuditTimelineProps) {
  const state = useAuditEvents({...filters, limit: pageSize});
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading audit events" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="No audit events" description="Events matching these filters will appear here." />}</>;
  return <ol className={`incld-audit-timeline ${className}`}>{state.data.data.map(event => <li key={event.id}>{renderItem ? renderItem(event) : <button type="button" onClick={() => onSelect?.(event)}><span className="incld-audit-marker" aria-hidden="true" /><span className="incld-audit-content"><strong>{label(event.type)}</strong><small>{[event.tombstonedAt ? 'Identity erased' : event.actorId ?? 'System', subjectLabel(event), event.component].filter(Boolean).join(' · ')}</small></span><time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time></button>}</li>)}</ol>;
}

export interface AuditEventDetailsProps extends AsyncViewProps { eventId?: string; event?: AuditEvent; className?: string }
export function AuditEventDetails({eventId, event: supplied, className = '', loading, error}: AuditEventDetailsProps) {
  const state = useAuditEvent(supplied ? undefined : eventId); const event = supplied ?? state.data;
  if (!event && state.status === 'loading') return <>{loading ?? <IncldSpinner label="Loading event" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  if (!event) return null;
  return <article className={`incld-audit-details ${className}`.trim()}><header><span className="incld-badge">{event.component}</span><h3>{label(event.type)}</h3><p>{formatDate(event.occurredAt)}</p>{event.tombstonedAt && <p role="status">PII erased · {label(event.tombstoneReason ?? 'customer_request')} · {formatDate(event.tombstonedAt)}</p>}</header><dl><div><dt>Actor</dt><dd>{event.tombstonedAt ? 'Erased' : event.actorId ?? 'System'}</dd></div><div><dt>Source</dt><dd>{event.source}</dd></div><div><dt>Subject</dt><dd>{event.tombstonedAt ? 'Erased' : subjectLabel(event) ?? '—'}</dd></div><div><dt>Visibility</dt><dd>{event.visibility}</dd></div></dl>{!event.tombstonedAt && <details><summary>Event data</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details>}</article>;
}

export interface AuditFiltersProps { value?: ListAuditEventsParams; defaultValue?: ListAuditEventsParams; onChange?: (filters: ListAuditEventsParams) => void; className?: string }
export function AuditFilters({value, defaultValue = {}, onChange, className = ''}: AuditFiltersProps) {
  const [internal, setInternal] = useState(defaultValue); const filters = value ?? internal;
  const update = (next: ListAuditEventsParams) => { if (value === undefined) setInternal(next); onChange?.(next); };
  return <div className={`incld-audit-filters ${className}`.trim()} role="search"><label><span>Component</span><input className="incld-input" value={filters.component ?? ''} onChange={event => update({...filters, component: event.target.value || undefined})} placeholder="approvals" /></label><label><span>Event type</span><input className="incld-input" value={filters.typePrefix ?? ''} onChange={event => update({...filters, typePrefix: event.target.value || undefined})} placeholder="approval." /></label><label><span>Since</span><input className="incld-input" type="date" value={filters.since?.slice(0, 10) ?? ''} onChange={event => update({...filters, since: event.target.value ? new Date(`${event.target.value}T00:00:00Z`).toISOString() : undefined})} /></label><button type="button" className="incld-button incld-button-secondary" onClick={() => update({})}>Clear</button></div>;
}
