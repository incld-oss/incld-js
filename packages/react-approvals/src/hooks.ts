import {useCallback, useEffect, useState} from 'react';
import {IncldError, type ApprovalCheckInput, type ApprovalRequestInput, type CreateApprovalPolicyInput, type ListApprovalsParams, type RequestOptions, type UpdateApprovalInput} from '@incld/client';
import {useAsyncResource, useIncld} from '@incld/react';

export function useApprovals(params: ListApprovalsParams = {}) {
  const {client, version} = useIncld(); const key = JSON.stringify(params);
  return useAsyncResource(signal => client.approvals.list(params, {signal}), [client, version, key]);
}

export function useApproval(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.approvals.get(id, {signal}) : undefined, [client, version, id]);
}

export function useApprovalCheck(input?: ApprovalCheckInput, refreshOnFocus = true) {
  const {client, version} = useIncld(); const key = JSON.stringify(input); const state = useAsyncResource(async signal => input ? client.approvals.check(input, {signal}) : undefined, [client, version, key]);
  useEffect(() => {
    if (!refreshOnFocus) return;
    const refresh = () => state.refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refreshOnFocus, state.refresh]);
  return state;
}

export function useApprovalPolicies() {
  const {client, version} = useIncld();
  return useAsyncResource(signal => client.approvalPolicies.list(undefined, {signal}), [client, version]);
}

export function useApprovalPolicy(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.approvalPolicies.get(id, {signal}) : undefined, [client, version, id]);
}

export function useApprovalPolicyMutation() {
  const {client, refresh, reportError} = useIncld(); const [pending, setPending] = useState(false); const [error, setError] = useState<IncldError>();
  const mutate = useCallback(async <T,>(operation: (options: RequestOptions) => Promise<T>) => {
    setPending(true); setError(undefined);
    try { const result = await operation({idempotencyKey: crypto.randomUUID()}); refresh(); return result; }
    catch (value) { const normalized = value instanceof IncldError ? value : new IncldError(value instanceof Error ? value.message : 'Request failed', {status: 0, code: 'request_failed'}); setError(normalized); reportError(normalized); throw normalized; }
    finally { setPending(false); }
  }, [client, refresh, reportError]);
  return {
    pending, error,
    create: (input: CreateApprovalPolicyInput) => mutate(options => client.approvalPolicies.create(input, options)),
    update: (id: string, input: Partial<CreateApprovalPolicyInput>) => mutate(options => client.approvalPolicies.update(id, input, options)),
    remove: (id: string) => mutate(options => client.approvalPolicies.remove(id, options)),
  };
}

export function useApprovalMutation() {
  const {client, refresh, reportError} = useIncld(); const [pending, setPending] = useState(false); const [error, setError] = useState<IncldError>();
  const mutate = useCallback(async <T,>(operation: (options: RequestOptions) => Promise<T>) => {
    setPending(true); setError(undefined);
    try { const result = await operation({idempotencyKey: crypto.randomUUID()}); refresh(); return result; }
    catch (value) { const normalized = value instanceof IncldError ? value : new IncldError(value instanceof Error ? value.message : 'Request failed', {status: 0, code: 'request_failed'}); setError(normalized); reportError(normalized); throw normalized; }
    finally { setPending(false); }
  }, [client, refresh, reportError]);
  return {
    pending, error,
    create: (input: ApprovalRequestInput) => mutate(options => client.approvals.create(input, options)),
    update: (id: string, input: UpdateApprovalInput) => mutate(options => client.approvals.update(id, input, options)),
    approve: (id: string, reason?: string) => mutate(options => client.approvals.approve(id, reason, options)),
    reject: (id: string, reason?: string) => mutate(options => client.approvals.reject(id, reason, options)),
    cancel: (id: string, reason?: string) => mutate(options => client.approvals.cancel(id, reason, options)),
    revoke: (id: string, reason?: string) => mutate(options => client.approvals.revoke(id, reason, options)),
  };
}
