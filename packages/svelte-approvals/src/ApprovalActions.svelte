<script lang="ts">
  import { getContext } from 'svelte';
  import type { Approval } from '@incld/client';
  import { INCLD_CONTEXT_KEY, type IncldContextValue } from './context';

  export let approval: Approval;
  export let showReason = true;
  export let allowCancel = true;
  export let onchanged: ((approval: Approval, action: 'approve' | 'reject' | 'cancel' | 'revoke') => void) | undefined = undefined;
  export let onerror: ((error: Error) => void) | undefined = undefined;

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let reason = '';
  let busy: string | null = null;
  let error: string | null = null;

  async function run(action: 'approve' | 'reject' | 'cancel' | 'revoke') {
    busy = action; error = null;
    try {
      const updated = action === 'approve'
        ? await api.approvals.approve(approval.id, undefined, reason || undefined)
        : action === 'reject'
          ? await api.approvals.reject(approval.id, undefined, reason || undefined)
          : action === 'cancel'
            ? await api.approvals.cancel(approval.id, undefined, reason || undefined)
            : await api.approvals.revoke(approval.id, undefined, reason || undefined);
      approval = updated; reason = ''; updateKey.update(value => value + 1); onchanged?.(updated, action);
    } catch (value) {
      const next = value instanceof Error ? value : new Error(`Failed to ${action} approval`);
      error = next.message; onerror?.(next);
    } finally { busy = null; }
  }
</script>

<div class="incld-approval-actions">
  {#if showReason}<label class="incld-field"><span class="incld-field-label">Reason / note</span><textarea class="incld-input" rows="2" bind:value={reason} disabled={busy !== null} placeholder="Optional reason recorded in the audit trail"></textarea></label>{/if}
  {#if error}<div class="incld-error" role="alert">{error}</div>{/if}
  <div class="incld-list-item-actions">
    {#if approval.status === 'pending'}
      {#if allowCancel}<button class="incld-control" disabled={busy !== null} on:click={() => run('cancel')}>{busy === 'cancel' ? 'Cancelling…' : 'Cancel'}</button>{/if}
      <button class="incld-control" disabled={busy !== null} on:click={() => run('reject')}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</button>
      <button class="incld-button incld-button-primary" disabled={busy !== null} on:click={() => run('approve')}>{busy === 'approve' ? 'Approving…' : 'Approve'}</button>
    {:else if approval.status === 'approved'}
      <button class="incld-control" disabled={busy !== null} on:click={() => run('revoke')}>{busy === 'revoke' ? 'Revoking…' : 'Revoke approval'}</button>
    {/if}
  </div>
</div>
