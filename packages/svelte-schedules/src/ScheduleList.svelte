<script lang="ts">
  import { getContext, tick } from 'svelte';
  import type { Schedule } from '@incld/client';
  import type { IncldContextValue } from './context';
  import { INCLD_CONTEXT_KEY } from './context';
  import ScheduleBuilder from './ScheduleBuilder.svelte';

  export let action: string | undefined = undefined;
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let title: string = 'Active schedules';
  export let description: string = 'Schedules configured for this account';
  export let loadingText: string = 'Loading schedules…';
  export let emptyText: string = 'No schedules found.';
  export let editLabel: string = 'Edit';
  export let pauseLabel: string = 'Pause';
  export let resumeLabel: string = 'Resume';
  export let deleteLabel: string = 'Delete';
  export let nextRunLabel: string = 'Next run';
  export let editTitle: string = 'Edit schedule';
  export let editDescription: string = 'Change when this action should run.';
  export let editSaveLabel: string = 'Save changes';
  export let editCancelLabel: string = 'Cancel';
  export let className: string = '';

  const { api, updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  let schedules: Schedule[] = [];
  let loading = true;
  let error: string | null = null;
  let hasLoaded = false;
  let editingSchedule: Schedule | undefined = undefined;
  let editDialog: HTMLDialogElement;
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  async function load() {
    const showLoading = !hasLoaded;
    if (showLoading) loading = true;
    error = null;
    try {
      schedules = (await api.schedules.list({ action } as any)).filter(schedule => schedule.status !== 'deleted');
      hasLoaded = true;
    } catch (e: any) {
      error = e.message;
    } finally {
      if (showLoading) loading = false;
    }
  }
  $: if ($updateKey >= 0) load();

  function replaceSchedule(next: Schedule) {
    const exists = schedules.some(schedule => schedule.id === next.id);
    schedules = (exists ? schedules.map(schedule => schedule.id === next.id ? next : schedule) : [...schedules, next])
      .filter(schedule => schedule.status !== 'deleted');
  }

  async function openEdit(schedule: Schedule) {
    editingSchedule = schedule;
    await tick();
    if (!editDialog.open) editDialog.showModal();
  }

  function closeEdit() {
    if (editDialog?.open) editDialog.close();
  }

  function handleEditSave(schedule: Schedule) {
    replaceSchedule(schedule);
    updateKey.update(n => n + 1);
    closeEdit();
  }

  async function handlePause(id: string) {
    replaceSchedule(await api.schedules.pause(id));
    updateKey.update(n => n + 1);
  }

  async function handleResume(id: string) {
    replaceSchedule(await api.schedules.resume(id));
    updateKey.update(n => n + 1);
  }

  async function handleDelete(id: string) {
    await api.schedules.delete(id);
    schedules = schedules.filter(schedule => schedule.id !== id);
    updateKey.update(n => n + 1);
  }

  function actionLabel(schedule: Schedule) {
    const named = schedule.action_name || schedule.action_identifier;
    if (!named) return 'Scheduled action';
    return named.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
  function recurrenceLabel(schedule: Schedule) {
    const recurrence: any = schedule.recurrence;
    if (recurrence.frequency === 'once') return `Once on ${recurrence.date} at ${recurrence.local_time}`;
    if (recurrence.frequency === 'daily') return `Every day at ${recurrence.local_time}`;
    if (recurrence.frequency === 'weekly') return `Every ${recurrence.weekdays?.join(', ') || 'week'} at ${recurrence.local_time}`;
    if (recurrence.frequency === 'monthly') return `Every month at ${recurrence.local_time}`;
    return 'Recurring schedule';
  }
</script>

<section class={`incld-list-shell ${className}`} style={configStyle}>
  <header>
    <div><h4>{title}</h4><p>{description}</p></div>
    <span>{schedules.length} {schedules.length === 1 ? 'schedule' : 'schedules'}</span>
  </header>

  {#if loading}
    <div class="state"><slot name="loading">{loadingText}</slot></div>
  {:else if error && schedules.length === 0}
    <div class="state error"><slot name="error" {error}>{error}</slot></div>
  {:else if schedules.length === 0}
    <div class="state"><slot name="empty">{emptyText}</slot></div>
  {:else}
    <div class="rows">
      {#each schedules as schedule (schedule.id)}
        {@const controls = { edit: () => openEdit(schedule), pause: () => handlePause(schedule.id), resume: () => handleResume(schedule.id), delete: () => handleDelete(schedule.id) }}
        {#if $$slots.item}
          <slot name="item" {schedule} {controls} />
        {:else}
          <article>
            <div class="content">
              <div class="heading">
                <strong>{actionLabel(schedule)}</strong>
                <slot name="status" {schedule} label={schedule.status}><span class:active={schedule.status === 'active'} class:paused={schedule.status === 'paused'}>{schedule.status}</span></slot>
              </div>
              <p>{recurrenceLabel(schedule)}</p>
              <small>{nextRunLabel}: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : 'None'}</small>
            </div>
            <div class="actions">
              <slot name="editButton" {schedule} {controls} label={editLabel}><button on:click={controls.edit}>{editLabel}</button></slot>
              {#if schedule.status === 'active'}<slot name="pauseButton" {schedule} {controls} label={pauseLabel}><button on:click={controls.pause}>{pauseLabel}</button></slot>{/if}
              {#if schedule.status === 'paused'}<slot name="resumeButton" {schedule} {controls} label={resumeLabel}><button class="resume" on:click={controls.resume}>{resumeLabel}</button></slot>{/if}
              <slot name="deleteButton" {schedule} {controls} label={deleteLabel}><button class="danger" on:click={controls.delete}>{deleteLabel}</button></slot>
            </div>
          </article>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<dialog bind:this={editDialog} class="edit-dialog" style={configStyle} on:close={() => editingSchedule = undefined} on:click={(event) => event.target === editDialog && closeEdit()}>
  {#if editingSchedule}
    <ScheduleBuilder
      schedule={editingSchedule}
      action={action || editingSchedule.action_identifier}
      payload={editingSchedule.payload}
      config={config}
      title={editTitle}
      description={editDescription}
      actionName={actionLabel(editingSchedule)}
      saveLabel={editSaveLabel}
      cancelLabel={editCancelLabel}
      on:save={(event) => handleEditSave(event.detail.schedule)}
      on:cancel={closeEdit}
    />
  {/if}
</dialog>

<style>
  .incld-list-shell{--incld-surface:#1f1f1f;--incld-header-surface:#1b1b1b;--incld-raised-surface:#292929;--incld-border:rgba(127,127,127,.18);--incld-overlay:rgba(127,127,127,.07);--incld-text:#f5f5f2;--incld-text-muted:#aaa;--incld-text-faint:#777;--incld-danger-text:#d78b8b;overflow:hidden;border:1px solid var(--incld-border);border-radius:var(--incld-radius,12px);background:var(--incld-surface);color:var(--incld-text);font-family:var(--incld-font-family,system-ui,-apple-system,sans-serif)}.incld-list-shell>header{padding:var(--incld-row-padding,1rem);display:flex;justify-content:space-between;gap:1rem;background:var(--incld-header-surface);border-bottom:1px solid var(--incld-border)}h4,p{margin:0}header h4{font-size:.875rem}header p,header span,.content p,.content small,.state{color:var(--incld-text-muted);font-size:.75rem}.rows article{padding:var(--incld-row-padding,1rem);display:flex;justify-content:space-between;align-items:center;gap:1rem;border-top:1px solid var(--incld-border)}.rows article:first-child{border-top:0}.heading{display:flex;align-items:center;gap:.5rem}.heading strong{font-size:.875rem}.heading span{padding:.1rem .4rem;border:1px solid var(--incld-status-neutral-border,var(--incld-border));border-radius:var(--incld-status-radius,999px);background:var(--incld-status-neutral-bg,var(--incld-overlay));color:var(--incld-status-neutral-text,var(--incld-text-muted));font-size:.68rem;text-transform:capitalize}.heading span.active{border-color:var(--incld-status-active-border,var(--incld-border));background:var(--incld-status-active-bg,var(--incld-overlay));color:var(--incld-status-active-text,var(--incld-text-muted))}.heading span.paused{border-color:var(--incld-status-paused-border,var(--incld-border));background:var(--incld-status-paused-bg,var(--incld-overlay));color:var(--incld-status-paused-text,var(--incld-text-muted))}.content p{margin:.25rem 0}.content small{color:var(--incld-text-faint)}.actions{display:flex;gap:.4rem}.actions button{padding:var(--incld-control-padding,.35rem .6rem);border:1px solid var(--incld-control-border,var(--incld-border));border-radius:var(--incld-control-radius,7px);background:var(--incld-control-bg,var(--incld-raised-surface));color:var(--incld-control-text,var(--incld-text-muted));cursor:pointer}.actions .resume{color:var(--incld-resume-text,var(--incld-text))}.actions .danger{color:var(--incld-danger-text)}.state{padding:var(--incld-row-padding,1rem)}.error{color:var(--incld-danger-text)}.edit-dialog{padding:0;margin:0;border:0;background:transparent;width:min(500px,calc(100vw - 2rem));max-width:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);overflow:visible}.edit-dialog::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}@media(max-width:640px){.rows article{align-items:stretch;flex-direction:column}.actions{width:100%;flex-wrap:wrap}.actions button{flex:1}.edit-dialog{width:calc(100vw - 1rem)}}
</style>
