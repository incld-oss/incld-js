<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { ApprovalPolicy, ApprovalPolicyMode } from '@incld/client';
  import { INCLD_CONTEXT_KEY, type IncldContextValue } from './context';
  export let editable = false;

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let policies: ApprovalPolicy[] = [];
  let editing: string | 'new' | null = null;
  let resourcePattern = '';
  let allowedApprovers = '';
  let mode: ApprovalPolicyMode = 'any';
  let requiredApprovals = 1;
  let allowSelfApproval = false;
  let busy = false;
  let error: string | null = null;

  async function load() { try { policies = await api.approvals.listPolicies(); } catch (value) { error = value instanceof Error ? value.message : 'Failed to load policies'; } }
  function edit(policy?: ApprovalPolicy) { editing = policy?.id ?? 'new'; resourcePattern = policy?.resourcePattern ?? ''; allowedApprovers = policy?.allowedApprovers.join(', ') ?? ''; mode = policy?.mode ?? 'any'; requiredApprovals = policy?.requiredApprovals ?? 1; allowSelfApproval = policy?.allowSelfApproval ?? false; error = null; }
  async function save() { busy = true; error = null; const params = { resourcePattern, allowedApprovers: allowedApprovers.split(',').map(v => v.trim()).filter(Boolean), mode, requiredApprovals, allowSelfApproval }; try { if (editing === 'new') await api.approvals.createPolicy(params); else if (editing) await api.approvals.updatePolicy(editing, params); editing = null; updateKey.update(v => v + 1); await load(); } catch (value) { error = value instanceof Error ? value.message : 'Failed to save policy'; } finally { busy = false; } }
  async function remove(id: string) { busy = true; try { await api.approvals.deletePolicy(id); updateKey.update(v => v + 1); await load(); } catch (value) { error = value instanceof Error ? value.message : 'Failed to delete policy'; } finally { busy = false; } }
  onMount(() => { void load(); return updateKey.subscribe(() => void load()); });
</script>

<section class="incld-panel incld-policy-list">
  <header class="incld-panel-header"><div><h3 class="incld-panel-title">Approval policies</h3><p class="incld-panel-desc">New requests snapshot the matching policy revision.</p></div>{#if editable}<button class="incld-button incld-button-primary" on:click={() => edit()}>New policy</button>{/if}</header>
  {#if error}<div class="incld-error" role="alert">{error}</div>{/if}
  <div class="incld-list-items">{#if policies.length === 0}<div class="incld-empty-state">No policies configured.</div>{:else}{#each policies as policy (policy.id)}<div class="incld-list-item"><div class="incld-list-item-main"><div class="incld-list-item-title">{policy.resourcePattern} <span class="incld-status-badge">rev {policy.revision}</span></div><div class="incld-list-item-meta">{policy.mode}{policy.mode === 'quorum' ? ` · ${policy.requiredApprovals} required` : ''} · {policy.allowedApprovers.length ? policy.allowedApprovers.join(', ') : 'any authenticated approver'} · self approval {policy.allowSelfApproval ? 'on' : 'off'}</div></div>{#if editable}<div class="incld-list-item-actions"><button class="incld-control" on:click={() => edit(policy)}>Edit</button><button class="incld-control" disabled={busy} on:click={() => remove(policy.id)}>Delete</button></div>{/if}</div>{/each}{/if}</div>
  {#if editing}<div class="incld-policy-editor"><label class="incld-field"><span class="incld-field-label">Resource pattern</span><input class="incld-input" bind:value={resourcePattern} /></label><label class="incld-field"><span class="incld-field-label">Allowed approvers</span><input class="incld-input" bind:value={allowedApprovers} /></label><label class="incld-field"><span class="incld-field-label">Mode</span><select class="incld-input" bind:value={mode}><option value="any">any</option><option value="all">all</option><option value="quorum">quorum</option></select></label><label class="incld-field"><span class="incld-field-label">Required approvals</span><input class="incld-input" type="number" min="1" bind:value={requiredApprovals} /></label><label class="incld-field"><input type="checkbox" bind:checked={allowSelfApproval} /> Allow self approval</label><div class="incld-list-item-actions"><button class="incld-control" on:click={() => editing = null}>Cancel</button><button class="incld-button incld-button-primary" disabled={busy || !resourcePattern} on:click={save}>{busy ? 'Saving…' : 'Save policy'}</button></div></div>{/if}
</section>
