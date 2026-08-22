<script lang="ts">
  import type { Approval } from '@incld/client';
  import ApprovalHistory from './ApprovalHistory.svelte';
  import ApprovalActions from './ApprovalActions.svelte';
  export let approval: Approval;
  export let showActions = true;

  $: approvedCount = approval.decisions.filter(decision => decision.decision === 'approved').length;
  $: requiredCount = approval.policySnapshot.mode === 'all' ? Math.max(approval.policySnapshot.allowedApprovers?.length ?? 0, 1) : approval.policySnapshot.mode === 'quorum' ? Math.max(approval.policySnapshot.requiredApprovals ?? 1, 1) : 1;
</script>

<article class="incld-panel incld-approval-details">
  <header class="incld-panel-header"><div><span class="incld-status-badge incld-status-{approval.status}">{approval.status}</span><h3 class="incld-panel-title">{approval.title || approval.resourceId}</h3>{#if approval.description}<p class="incld-panel-desc">{approval.description}</p>{/if}</div></header>
  <div class="incld-details-grid">
    <div><span>Requester</span><strong>{approval.requesterId || '—'}</strong></div><div><span>Resource</span><strong>{approval.resourceId}</strong></div>
    <div><span>Policy</span><strong>{approval.policySnapshot.resourcePattern || 'No policy'} · {approval.policySnapshot.mode || 'any'}</strong></div><div><span>Progress</span><strong>{approvedCount}/{requiredCount}</strong></div>
    <div><span>Allowed approvers</span><strong>{approval.policySnapshot.allowedApprovers?.length ? approval.policySnapshot.allowedApprovers.join(', ') : 'Any authenticated approver'}</strong></div><div><span>Self approval</span><strong>{approval.policySnapshot.allowSelfApproval ? 'Allowed' : 'Blocked'}</strong></div>
    <div><span>Request revision</span><strong>{approval.revision}</strong></div><div><span>Policy revision</span><strong>{approval.policySnapshot.revision ?? '—'}</strong></div>
  </div>
  {#if approval.decisions.length}<section class="incld-section"><h4>Decisions</h4>{#each approval.decisions as decision (decision.id)}<div class="incld-list-item"><div><strong>{decision.decision}</strong><div>{decision.actorId} · {new Date(decision.createdAt).toLocaleString()}{decision.reason ? ` · ${decision.reason}` : ''}</div></div></div>{/each}</section>{/if}
  <section class="incld-section"><ApprovalHistory {approval} /></section>
  {#if Object.keys(approval.metadata).length}<section class="incld-section"><h4>Metadata</h4><pre class="incld-code">{JSON.stringify(approval.metadata, null, 2)}</pre></section>{/if}
  {#if showActions}<section class="incld-section"><ApprovalActions bind:approval /></section>{/if}
</article>
