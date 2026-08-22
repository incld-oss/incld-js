import React, {useEffect, useState} from 'react';
import {IncldButton, IncldEmptyState, IncldErrorState, IncldSpinner, type AsyncViewProps} from '@incld/react';
import type {BulkOperation, ListBulkOperationsParams} from '@incld/client';
import {useBulkChunks, useBulkEvents, useBulkOperation, useBulkOperationMutation, useBulkOperations} from './hooks.js';

export interface BulkProgressProps extends AsyncViewProps { operationId?: string; operation?: BulkOperation; cancellable?: boolean; onCancelled?: () => void; className?: string }
export function BulkProgress({operationId, operation: supplied, cancellable = false, onCancelled, className = '', loading, error}: BulkProgressProps) {
  const state = useBulkOperation(supplied ? undefined : operationId); const mutation = useBulkOperationMutation();
  const [optimisticOperation, setOptimisticOperation] = useState<BulkOperation>();
  useEffect(() => { if (state.data) setOptimisticOperation(state.data); }, [state.data]);
  if (!state.data && state.status === 'loading') return <>{loading ?? <IncldSpinner label="Loading operation" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  const operation = optimisticOperation ?? supplied ?? state.data; if (!operation) return null; const terminal = ['succeeded','completed_with_errors','cancelled'].includes(operation.status);
  const cancel = async () => { try { const cancelled = await mutation.cancel(operation.id); setOptimisticOperation(cancelled); onCancelled?.(); } catch { /* Keep live progress visible and expose the inline error. */ } };
  const percentage = Math.max(0, Math.min(operation.progress.percentage, 100));
  return <section className={`incld-bulk-progress ${className}`.trim()}><header><div><span className={`incld-badge incld-badge-${operation.status}`}>{operation.status.replaceAll('_',' ')}</span><h3>{operation.action}</h3></div><strong>{percentage}%</strong></header><div className="incld-progress-track" role="progressbar" aria-label={`${operation.action} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:`${percentage}%`}} /></div><dl><div><dt>Processed</dt><dd>{operation.progress.completedChunks} / {operation.progress.totalChunks} chunks</dd></div><div><dt>Succeeded</dt><dd>{operation.progress.succeededChunks}</dd></div><div><dt>Failed</dt><dd>{operation.progress.failedChunks}</dd></div></dl>{mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}{cancellable && !terminal && <IncldButton type="button" className="incld-button-secondary" busy={mutation.pending} onClick={cancel}>Cancel operation</IncldButton>}</section>;
}

export interface BulkOperationListProps extends AsyncViewProps { filters?: ListBulkOperationsParams; onSelect?: (id: string) => void; className?: string }
export function BulkOperationList({filters = {}, onSelect, className = '', loading, empty, error}: BulkOperationListProps) {
  const state = useBulkOperations(filters); if (!state.data && state.status === 'loading') return <>{loading ?? <IncldSpinner label="Loading operations" />}</>; if (state.error) return <>{error?.(state.error,state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>; if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="No bulk operations" description="Operational history will appear here." />}</>;
  return <div className={`incld-bulk-list ${className}`.trim()}>{state.data.data.map(operation => <button type="button" key={operation.id} onClick={() => onSelect?.(operation.id)}><span><strong>{operation.action}</strong><small>{operation.progress.totalItems} items</small></span><span><span className={`incld-badge incld-badge-${operation.status}`}>{operation.status.replaceAll('_',' ')}</span><small>{operation.progress.percentage}%</small></span></button>)}</div>;
}

export interface BulkOperationDetailsProps { operationId: string; className?: string }
export function BulkOperationDetails({operationId, className = ''}: BulkOperationDetailsProps) {
  const chunks = useBulkChunks(operationId); const events = useBulkEvents(operationId);
  return <article className={`incld-bulk-details ${className}`.trim()}><BulkProgress operationId={operationId} cancellable /><section><h4>Chunks</h4>{chunks.status === 'loading' && !chunks.data ? <IncldSpinner label="Loading chunks" /> : chunks.error ? <IncldErrorState error={chunks.error} retry={chunks.refresh} /> : !chunks.data?.data.length ? <IncldEmptyState title="No chunks yet" description="Chunks appear as the operation is prepared." /> : <div className="incld-bulk-inspection">{chunks.data.data.map(chunk => <div key={chunk.id}><span><strong>Chunk {chunk.index + 1}</strong><small>{chunk.items.length} items · {chunk.attemptCount} attempts</small></span><span className={`incld-badge incld-badge-${chunk.status}`}>{chunk.status}</span>{chunk.error && <p>{chunk.error}</p>}</div>)}</div>}</section><section><h4>Events</h4>{events.status === 'loading' && !events.data ? <IncldSpinner label="Loading events" /> : events.error ? <IncldErrorState error={events.error} retry={events.refresh} /> : !events.data?.data.length ? <IncldEmptyState title="No events yet" description="Lifecycle events appear when processing begins." /> : <ol className="incld-bulk-events">{events.data.data.map(event => <li key={event.id}><strong>{event.type.replaceAll('.', ' ')}</strong><span>{new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(new Date(event.createdAt))}</span></li>)}</ol>}</section></article>;
}
