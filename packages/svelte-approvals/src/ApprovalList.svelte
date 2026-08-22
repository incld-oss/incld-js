<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Approval, ApprovalStatus } from '@incld/client';
  import { INCLD_CONTEXT_KEY, type IncldContextValue } from './context';
  import ApprovalActions from './ApprovalActions.svelte';

  export let status: ApprovalStatus | undefined = undefined;
  export let resourceId: string | undefined = undefined;
  export let requesterId: string | undefined = undefined;
  export let approverId: string | undefined = undefined;
  export let title = 'Approvals';
  export let showActions = true;
  export let showPolicy = true;

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let approvals: Approval[] = [];
  let loading = true;
  let error: string | null = null;
  let expanded: string | null = null;

  function progress(approval: Approval) {
    const approved = approval.decisions.filter(decision => decision.decision === 'approved').length;
    const policy = approval.policySnapshot;
    const required = policy.mode === 'all' ? Math.max(policy.allowedApprovers?.length ?? 0, 1) : policy.mode === 'quorum' ? Math.max(policy.requiredApprovals ?? 1, 1) : 1;
    return `${approved}/${required}`;
  }

  async function load() {
    loading = true; error = null;
    try { approvals = await api.approvals.list({ status, resourceId, requesterId, approverId }); }
    catch (value) { error = value instanceof Error ? value.message : 'Failed to load approvals'; }
    finally { loading = false; }
  }

  onMount(() => { void load(); return updateKey.subscribe(() => { void load(); }); });
</script>

<section class="incld-panel incld-list">
  <header class="incld-panel-header"><h3 class="incld-panel-title">{title}</h3></header>
  {#if error}<div class="incld-empty-state" role="alert">{error}</div>
  {:else if loading}<div class="incld-empty-state">Loading…</div>
  {:else if approvals.length === 0}<div class="incld-empty-state">No approvals found.</div>
  {:else}
    <div class="incld-list-items">{#each approvals as approval (approval.id)}
      <div class="incld-list-item incld-list-item-stacked">
        <button class="incld-list-item-main" on:click={() => expanded = expanded === approval.id ? null : approval.id}>
          <div class="incld-list-item-title">{approval.title || approval.resourceId} <span class="incld-status-badge incld-status-{approval.status}">{approval.status}</span></div>
          <div class="incld-list-item-meta">{approval.description || approval.resourceId} · {approval.requesterId || 'Unknown requester'}{showPolicy ? ` · ${approval.policySnapshot.mode || 'any'} ${progress(approval)}` : ''}</div>
        </button>
        {#if approval.decisions.length}<div class="incld-decision-chips">{#each approval.decisions as decision (decision.id)}<span class="incld-status-badge">{decision.actorId}: {decision.decision}{decision.reason ? ` · ${decision.reason}` : ''}</span>{/each}</div>{/if}
        {#if showActions && expanded === approval.id}<ApprovalActions bind:approval />{/if}
      </div>
    {/each}</div>
  {/if}
</section>
