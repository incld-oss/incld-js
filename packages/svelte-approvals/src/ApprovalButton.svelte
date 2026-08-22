<script lang="ts">
  import { getContext } from 'svelte';
  import type { Approval } from '@incld/client';
  import { INCLD_CONTEXT_KEY, type IncldContextValue } from './context';

  export let resourceId: string;
  export let requesterId: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let metadata: Record<string, any> = {};
  export let expiresAt: string | undefined = undefined;
  export let idempotencyKey: string | undefined = undefined;
  export let label = 'Request approval';
  export let onApprovalCreated: ((approval: Approval) => void) | undefined = undefined;

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let loading = false;

  async function submit() {
    loading = true;
    try {
      const approval = await api.approvals.create({ resourceId, requesterId, title, description, metadata, expiresAt, idempotencyKey });
      onApprovalCreated?.(approval);
      updateKey.update(value => value + 1);
    } finally { loading = false; }
  }
</script>

<button type="button" class="incld-button incld-button-primary" disabled={loading} on:click={submit}>{loading ? 'Requesting…' : label}</button>
