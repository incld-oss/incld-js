<script lang="ts">
  import { getContext } from 'svelte';
  import type { Run } from '@incld/client';
  import type { IncldContextValue } from './context';
  import { INCLD_CONTEXT_KEY } from './context';

  export let action: string | undefined = undefined;
  export let scheduleId: string | undefined = undefined;
  export let limit: number | undefined = undefined;
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let title: string = 'Execution history';
  export let description: string = 'Recent scheduled callback attempts';
  export let loadingText: string = 'Loading history…';
  export let emptyText: string = 'No runs recorded yet.';
  export let scheduledTimeLabel: string = 'Scheduled time';
  export let actionLabelText: string = 'Action';
  export let statusLabel: string = 'Status';
  export let className: string = '';

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let runs: Run[] = [];
  let loading = true;
  let error: string | null = null;
  let hasLoaded = false;
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  async function load() {
    const showLoading = !hasLoaded;
    if (showLoading) loading = true;
    error = null;
    try {
      runs = await api.runs.list({ action, scheduleId, limit });
      hasLoaded = true;
    } catch (e: any) {
      error = e.message;
    } finally {
      if (showLoading) loading = false;
    }
  }
  $: if ($updateKey >= 0) load();

  function actionLabel(run: Run) {
    const named = run.action_name || run.action_identifier;
    if (!named) return 'Scheduled action';
    return named.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function statusSemantic(status: Run['status']) {
    if (status === 'succeeded' || status === 'delivered') return 'success';
    if (status === 'retrying' || status === 'delivering' || status === 'scheduled') return 'pending';
    if (status === 'failed' || status === 'cancelled') return 'danger';
    return 'neutral';
  }
</script>

<section class={`incld-history-shell ${className}`} style={configStyle}>
  <header>
    <div><h4>{title}</h4><p>{description}</p></div>
    <span>{runs.length} {runs.length === 1 ? 'run' : 'runs'}</span>
  </header>

  {#if loading}
    <div class="state"><slot name="loading">{loadingText}</slot></div>
  {:else if error && runs.length === 0}
    <div class="state error"><slot name="error" {error}>{error}</slot></div>
  {:else if runs.length === 0}
    <div class="state"><slot name="empty">{emptyText}</slot></div>
  {:else if $$slots.run}
    <div class="rows">{#each runs as run (run.id)}<slot name="run" {run} />{/each}</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead><tr><th>{scheduledTimeLabel}</th><th>{actionLabelText}</th><th>{statusLabel}</th></tr></thead>
        <tbody>
          {#each runs as run (run.id)}
            <tr>
              <td>{new Date(run.scheduled_at).toLocaleString()}</td>
              <td>{actionLabel(run)}</td>
              <td><slot name="status" {run} label={run.status}><span class={`status ${statusSemantic(run.status)}`}>{run.status}</span></slot></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .incld-history-shell{--incld-surface:#1f1f1f;--incld-header-surface:#1b1b1b;--incld-dark-surface:#181818;--incld-border:rgba(127,127,127,.18);--incld-overlay:rgba(127,127,127,.07);--incld-text:#f5f5f2;--incld-text-muted:#aaa;--incld-text-faint:#777;--incld-danger-text:#d78b8b;overflow:hidden;border:1px solid var(--incld-border);border-radius:var(--incld-radius,12px);background:var(--incld-surface);color:var(--incld-text);font-family:var(--incld-font-family,system-ui,-apple-system,sans-serif)}.incld-history-shell>header{padding:1rem;display:flex;justify-content:space-between;gap:1rem;background:var(--incld-header-surface);border-bottom:1px solid var(--incld-border)}h4,p{margin:0}header h4{font-size:.875rem}header p,header span,.state{color:var(--incld-text-muted);font-size:.75rem}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.75rem;text-align:left}th{padding:.6rem 1rem;background:var(--incld-dark-surface);color:var(--incld-text-faint);font-size:.65rem;font-weight:500;letter-spacing:.04em}td{padding:.75rem 1rem;border-top:1px solid var(--incld-border)}td:first-child{color:var(--incld-text-muted);white-space:nowrap}.status{display:inline-flex;padding:.1rem .4rem;border:1px solid var(--incld-status-neutral-border,var(--incld-border));border-radius:999px;background:var(--incld-status-neutral-bg,var(--incld-overlay));color:var(--incld-status-neutral-text,var(--incld-text-muted));font-size:.66rem;text-transform:capitalize}.status.success{border-color:var(--incld-status-success-border,var(--incld-border));background:var(--incld-status-success-bg,var(--incld-overlay));color:var(--incld-status-success-text,var(--incld-text-muted))}.status.pending{border-color:var(--incld-status-pending-border,var(--incld-border));background:var(--incld-status-pending-bg,var(--incld-overlay));color:var(--incld-status-pending-text,var(--incld-text-muted))}.status.danger{border-color:var(--incld-status-danger-border,var(--incld-border));background:var(--incld-status-danger-bg,var(--incld-overlay));color:var(--incld-status-danger-text,var(--incld-danger-text))}.state{padding:1rem}.error{color:var(--incld-danger-text)}.rows>*{border-top:1px solid var(--incld-border)}
</style>
