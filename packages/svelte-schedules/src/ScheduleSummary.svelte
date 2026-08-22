<script lang="ts">
  import type { Schedule } from '@incld/client';
  import { getContext } from 'svelte';
  import { INCLD_CONTEXT_KEY } from './context';
  import type { IncldContextValue } from './context';

  export let schedule: Schedule | null = null;
  export let loading: boolean = false;
  export let error: string | null = null;
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let title: string | undefined = undefined;
  export let scheduleLabel: string = 'Schedule';
  export let nextRunLabel: string = 'Next run';
  export let loadingText: string = 'Loading…';
  export let emptyText: string = 'No schedule found.';
  export let className: string = '';
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  function actionLabel(value: Schedule) {
    const named = value.action_name || value.action_identifier;
    if (!named) return 'Scheduled action';
    return named.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function recurrenceSummary(recurrence: any): string {
    if (!recurrence) return 'Unknown';
    if (recurrence.frequency === 'once') return `Once on ${recurrence.date} at ${recurrence.local_time}`;
    if (recurrence.frequency === 'daily') return `Every day at ${recurrence.local_time}`;
    if (recurrence.frequency === 'weekly') return `Every ${recurrence.weekdays?.join(', ') || 'week'} at ${recurrence.local_time}`;
    if (recurrence.frequency === 'monthly') return `Every month at ${recurrence.local_time}`;
    return 'Recurring';
  }
</script>

{#if loading}
  <div class={`incld-summary-state ${className}`} style={configStyle}><slot name="loading">{loadingText}</slot></div>
{:else if error}
  <div class={`incld-summary-state error ${className}`} style={configStyle}><slot name="error" {error}>{error}</slot></div>
{:else if schedule}
  {#if $$slots.default}
    <slot {schedule} />
  {:else}
    <section class={`incld-summary ${className}`} style={configStyle}>
      <header>
        <h3>{title || actionLabel(schedule)}</h3>
        <slot name="status" {schedule} label={schedule.status}><span class:active={schedule.status === 'active'} class:paused={schedule.status === 'paused'}>{schedule.status}</span></slot>
      </header>
      <div class="detail"><small>{scheduleLabel}</small><strong>{recurrenceSummary(schedule.recurrence)}</strong></div>
      <div class="detail"><small>{nextRunLabel}</small><strong>{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : 'None'}</strong></div>
    </section>
  {/if}
{:else}
  <div class={`incld-summary-state ${className}`} style={configStyle}><slot name="empty">{emptyText}</slot></div>
{/if}

<style>
  .incld-summary,.incld-summary-state{--incld-surface:#1f1f1f;--incld-border:rgba(127,127,127,.18);--incld-overlay:rgba(127,127,127,.07);--incld-text:#f5f5f2;--incld-text-muted:#aaa;--incld-text-faint:#777;--incld-danger-text:#c9a6a6;padding:1rem;border:1px solid var(--incld-border);border-radius:var(--incld-radius,12px);background:var(--incld-surface);color:var(--incld-text);font-family:var(--incld-font-family,system-ui,-apple-system,sans-serif)}.incld-summary header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.8rem}.incld-summary h3{margin:0;font-size:.875rem}.incld-summary header span{padding:.1rem .4rem;border:1px solid var(--incld-status-neutral-border,var(--incld-border));border-radius:999px;background:var(--incld-status-neutral-bg,var(--incld-overlay));color:var(--incld-status-neutral-text,var(--incld-text-muted));font-size:.68rem;text-transform:capitalize}.incld-summary header span.active{border-color:var(--incld-status-active-border,var(--incld-border));background:var(--incld-status-active-bg,var(--incld-overlay));color:var(--incld-status-active-text,var(--incld-text-muted))}.incld-summary header span.paused{border-color:var(--incld-status-paused-border,var(--incld-border));background:var(--incld-status-paused-bg,var(--incld-overlay));color:var(--incld-status-paused-text,var(--incld-text-muted))}.detail{padding:.65rem .7rem;border:1px solid var(--incld-border);border-radius:8px;background:var(--incld-overlay);margin-top:.6rem}.detail small{display:block;color:var(--incld-text-faint);font-size:.66rem;margin-top:.15rem;color:var(--incld-text);font-size:.75rem;font-weight:500}.incld-summary-state{color:var(--incld-text-muted);font-size:.78rem}.error{color:var(--incld-danger-text)}
</style>
