import React, {useEffect, useState} from 'react';
import {IncldButton, IncldEmptyState, IncldErrorState, IncldSpinner, type AsyncViewProps} from '@incld/react';
import type {BulkOperation, ListBulkOperationsParams} from '@incld/client';
import {useBulkChunks, useBulkOperation, useBulkOperationMutation, useBulkOperations} from './hooks.js';

const actionLabel = (value: string) => value.replaceAll('_', ' ').replaceAll('.', ' ');

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
  return <section className={`incld-bulk-progress ${className}`.trim()}><header><div className="incld-title-row"><h3>{actionLabel(operation.action)}</h3><span className={`incld-badge incld-badge-${operation.status}`}>{operation.status.replaceAll('_',' ')}</span></div><strong>{percentage}%</strong></header><div className="incld-progress-track" role="progressbar" aria-label={`${actionLabel(operation.action)} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:`${percentage}%`}} /></div><p className="incld-bulk-summary">{operation.progress.totalItems} items · {operation.progress.completedChunks} of {operation.progress.totalChunks} batches complete{operation.progress.failedChunks > 0 ? ` · ${operation.progress.failedChunks} failed` : ''}</p>{mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}{cancellable && !terminal && <IncldButton type="button" className="incld-button-secondary" busy={mutation.pending} onClick={cancel}>Cancel operation</IncldButton>}</section>;
}

export interface BulkOperationListProps extends AsyncViewProps { filters?: ListBulkOperationsParams; onSelect?: (id: string) => void; className?: string }
export function BulkOperationList({filters = {}, onSelect, className = '', loading, empty, error}: BulkOperationListProps) {
  const state = useBulkOperations(filters); if (!state.data && state.status === 'loading') return <>{loading ?? <IncldSpinner label="Loading operations" />}</>; if (state.error) return <>{error?.(state.error,state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>; if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="No bulk operations" description="Operational history will appear here." />}</>;
  return <div className={`incld-bulk-list ${className}`.trim()}>{state.data.data.map(operation => <button type="button" key={operation.id} onClick={() => onSelect?.(operation.id)}><span><strong>{actionLabel(operation.action)}</strong><small>{operation.progress.totalItems} items</small></span><span><span className={`incld-badge incld-badge-${operation.status}`}>{operation.status.replaceAll('_',' ')}</span><small>{operation.progress.percentage}%</small></span></button>)}</div>;
}

export interface BulkOperationDetailsProps { operationId: string; className?: string }
export function BulkOperationDetails({operationId, className = ''}: BulkOperationDetailsProps) {
  const chunks = useBulkChunks(operationId);
  return <article className={`incld-bulk-details ${className}`.trim()}><BulkProgress operationId={operationId} cancellable /><section><h4>Batches</h4>{chunks.status === 'loading' && !chunks.data ? <IncldSpinner label="Loading batches" /> : chunks.error ? <IncldErrorState error={chunks.error} retry={chunks.refresh} /> : !chunks.data?.data.length ? <IncldEmptyState title="No batches yet" description="Batches will appear when processing begins." /> : <div className="incld-bulk-inspection">{chunks.data.data.map(chunk => <div key={chunk.id}><span><strong>Batch {chunk.index + 1}</strong><small>{chunk.items.length} items{chunk.attemptCount > 1 ? ` · ${chunk.attemptCount} attempts` : ''}</small></span><span className={`incld-badge incld-badge-${chunk.status}`}>{chunk.status}</span>{chunk.error && <p>{chunk.error}</p>}</div>)}</div>}</section></article>;
}
