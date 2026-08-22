import type {ListAuditEventsParams} from '@incld/client';
import {useAsyncResource, useIncld} from '@incld/react';

export function useAuditEvents(params: ListAuditEventsParams = {}) {
  const {client, version} = useIncld(); const key = JSON.stringify(params);
  return useAsyncResource(signal => client.auditEvents.list(params, {signal}), [client, version, key]);
}

export function useAuditEvent(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.auditEvents.get(id, {signal}) : undefined, [client, version, id]);
}
