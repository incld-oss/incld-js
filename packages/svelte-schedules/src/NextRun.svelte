<script lang="ts">
  import type { Schedule } from '@incld/client';
  import { getContext } from 'svelte';
  import { INCLD_CONTEXT_KEY } from './context';
  import type { IncldContextValue } from './context';

  export let schedule: Schedule | null = null;
  export let loading: boolean = false;
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let label: string = 'Next run';
  export let loadingText: string = 'Loading…';
  export let emptyText: string = 'No upcoming runs';
  export let showTimezone: boolean = true;
  export let className: string = '';
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  function formattedDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  }
</script>

{#if loading}
  <div class={`incld-next-run ${className}`} style={configStyle}><slot name="loading">{loadingText}</slot></div>
{:else if schedule && schedule.next_run_at}
  {#if $$slots.default}
    <slot {schedule} nextRunAt={schedule.next_run_at} />
  {:else}
    <div class={`incld-next-run ${className}`} style={configStyle}>
      <small>{label}</small>
      <strong>{formattedDate(schedule.next_run_at)}{#if showTimezone && schedule.recurrence.timezone}<span> ({schedule.recurrence.timezone})</span>{/if}</strong>
    </div>
  {/if}
{:else}
  <div class={`incld-next-run ${className}`} style={configStyle}><slot name="empty">{emptyText}</slot></div>
{/if}

<style>
  .incld-next-run{--incld-surface:#1f1f1f;--incld-border:rgba(127,127,127,.18);--incld-text:#f5f5f2;--incld-text-muted:#aaa;--incld-text-faint:#777;padding:.7rem .8rem;border:1px solid var(--incld-border);border-radius:var(--incld-radius,10px);background:var(--incld-surface);color:var(--incld-text-muted);font:400 .75rem/1.25rem var(--incld-font-family,system-ui,-apple-system,sans-serif)}.incld-next-run small{display:block;color:var(--incld-text-faint);font-size:.66rem;margin-top:.15rem;color:var(--incld-text);font-size:.78rem;font-weight:500}.incld-next-run strong span{color:var(--incld-text-muted);font-weight:400}
</style>
