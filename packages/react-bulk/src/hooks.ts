import {useCallback, useEffect, useState} from 'react';
import {IncldError, type ListBulkOperationsParams} from '@incld/client';
import {useAsyncResource, useIncld} from '@incld/react';

export function useBulkOperations(params: ListBulkOperationsParams = {}) {
  const {client, version} = useIncld(); const key = JSON.stringify(params);
  return useAsyncResource(signal => client.bulkOperations.list(params, {signal}), [client, version, key]);
}

export function useBulkOperation(id?: string, pollInterval = 2000) {
  const {client, version} = useIncld(); const state = useAsyncResource(async signal => id ? client.bulkOperations.get(id, {signal}) : undefined, [client, version, id]);
  useEffect(() => {
    if (!id || !state.data || ['succeeded','completed_with_errors','cancelled'].includes(state.data.status)) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') state.refresh(); }, pollInterval);
    return () => window.clearInterval(timer);
  }, [id, pollInterval, state.data?.status, state.refresh]);
  return state;
}

export function useBulkChunks(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.bulkOperations.chunks(id, {limit: 100}, {signal}) : undefined, [client, version, id]);
}

export function useBulkEvents(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.bulkOperations.events(id, {limit: 100}, {signal}) : undefined, [client, version, id]);
}

export function useBulkOperationMutation() {
  const {client, refresh, reportError} = useIncld(); const [pending, setPending] = useState(false); const [error, setError] = useState<IncldError>();
  const cancel = useCallback(async (id: string, reason?: string) => { setPending(true); setError(undefined); try { const result = await client.bulkOperations.cancel(id, reason); refresh(); return result; } catch (value) { const normalized = value instanceof IncldError ? value : new IncldError('Request failed', {status:0,code:'request_failed'}); setError(normalized); reportError(normalized); throw normalized; } finally { setPending(false); } }, [client, refresh, reportError]);
  return {cancel, pending, error};
}
