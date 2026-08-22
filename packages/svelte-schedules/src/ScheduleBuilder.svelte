<script lang="ts">
  import { getContext, createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { EndCondition, Recurrence, Schedule, SchedulePreview, Weekday } from '@incld/client';
  import type { IncldContextValue } from './context';
  import { INCLD_CONTEXT_KEY } from './context';

  export let action: string | undefined = undefined;
  export let schedule: Schedule | undefined = undefined;
  export let payload: Record<string, unknown> = {};
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let title: string | undefined = undefined;
  export let description: string = 'Choose when this action should run.';
  export let actionName: string | undefined = undefined;
  export let frequencyLabel: string = 'Frequency';
  export let weekdaysLabel: string = 'Days of the week';
  export let monthlyLabel: string = 'Monthly schedule';
  export let onceLabel: string = 'Run once';
  export let dailyLabel: string = 'Daily schedule';
  export let timeLabel: string = 'Time';
  export let timezoneLabel: string = 'Timezone';
  export let endsLabel: string = 'Ends';
  export let summaryLabel: string = 'Summary';
  export let previewTitle: string = 'Upcoming runs';
  export let previewCount: number = 3;
  export let saveLabel: string | undefined = undefined;
  export let cancelLabel: string = 'Cancel';
  export let initialRecurrence: Partial<Recurrence> | undefined = undefined;
  export let className: string = '';

  const dispatch = createEventDispatcher();
  const { api } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const sourceRecurrence = schedule?.recurrence || initialRecurrence;

  const weekdays: { value: Weekday; label: string }[] = [
    { value: 'monday', label: 'Mon' }, { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' }, { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' }, { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' },
  ];

  const monthlyOptions = [
    ['day_of_month', 'Day of month'], ['first_monday', 'First Monday'],
    ['last_friday', 'Last Friday'], ['last_day', 'Last day'],
  ] as const;

  let frequency: 'once' | 'daily' | 'weekly' | 'monthly' = (sourceRecurrence?.frequency as any) || 'once';
  let selectedWeekdays: Weekday[] = (sourceRecurrence as any)?.weekdays || [];
  let monthlyMode = (sourceRecurrence as any)?.monthly_mode || schedule?.recurrence?.monthly_mode || 'day_of_month';
  let dayOfMonth = (sourceRecurrence as any)?.day_of_month || schedule?.recurrence?.day_of_month || 1;
  let date = (sourceRecurrence as any)?.date || schedule?.recurrence?.date || new Date().toISOString().slice(0, 10);
  let localTime = (sourceRecurrence as any)?.local_time || schedule?.recurrence?.local_time || '09:00';
  let timezone = (sourceRecurrence as any)?.timezone || schedule?.timezone || 'UTC';
  let endCondition: EndCondition = (sourceRecurrence as any)?.ends || { type: 'never' };
  let saving = false;
  let error: string | null = null;
  let preview: SchedulePreview | null = null;
  let previewLoading = false;
  let previewError: string | null = null;
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let previewSequence = 0;

  $: resolvedTitle = title || (schedule ? 'Edit schedule' : 'Schedule an action');
  $: resolvedSaveLabel = saveLabel || (schedule ? 'Save changes' : 'Save schedule');
  $: recurrence = ({
    frequency,
    ...(frequency !== 'once' ? { interval: 1 } : {}),
    ...(frequency === 'weekly' ? { weekdays: selectedWeekdays } : {}),
    ...(frequency === 'monthly' ? { monthly_mode: monthlyMode } : {}),
    ...(frequency === 'monthly' && monthlyMode === 'day_of_month' ? { day_of_month: dayOfMonth } : {}),
    ...(frequency === 'once' ? { date } : {}),
    local_time: localTime,
    timezone,
    ...(endCondition.type !== 'never' ? { ends: endCondition } : {}),
  }) as Recurrence;
  $: valid = (!!schedule || !!action) && (frequency !== 'weekly' || selectedWeekdays.length > 0);
  $: previewKey = JSON.stringify({ recurrence, previewCount, valid });
  $: schedulePreview(previewKey);
  $: monthlyDayMode = frequency === 'monthly' && monthlyMode === 'day_of_month';
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  onMount(() => {
    if (!(sourceRecurrence as any)?.timezone && !schedule?.timezone) {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  });

  function schedulePreview(_key: string) {
    if (typeof window === 'undefined') return;
    if (previewTimer) clearTimeout(previewTimer);
    if (!valid) { preview = null; previewError = null; previewLoading = false; return; }
    const sequence = ++previewSequence;
    previewTimer = setTimeout(async () => {
      previewLoading = true; previewError = null;
      try {
        const result = await api.schedules.preview({ recurrence, count: previewCount });
        if (sequence === previewSequence) preview = result;
      } catch (e: any) {
        if (sequence === previewSequence) { preview = null; previewError = e.message || 'Unable to preview schedule'; }
      } finally {
        if (sequence === previewSequence) previewLoading = false;
      }
    }, 180);
  }

  onDestroy(() => { if (previewTimer) clearTimeout(previewTimer); });

  function toggleWeekday(day: Weekday) { selectedWeekdays = selectedWeekdays.includes(day) ? selectedWeekdays.filter(value => value !== day) : [...selectedWeekdays, day]; }
  function setEndType(type: EndCondition['type']) {
    if (type === 'never') endCondition = { type: 'never' };
    if (type === 'after_occurrences') endCondition = { type, count: 10 };
    if (type === 'on_date') { const end = new Date(); end.setDate(end.getDate() + 30); endCondition = { type, date: end.toISOString().slice(0, 10) }; }
  }
  function setDay(value: string) { dayOfMonth = Math.max(1, Math.min(31, Number.parseInt(value, 10) || 1)); }
  function setOccurrenceCount(value: string) { endCondition = { type: 'after_occurrences', count: Math.max(1, Number.parseInt(value, 10) || 1) }; }
  function setEndDate(value: string) { endCondition = { type: 'on_date', date: value }; }

  async function handleSave() {
    if (!valid) return;
    saving = true; error = null;
    try {
      const nextPayload = Object.keys(payload).length ? payload : (schedule?.payload || {});
      const saved = schedule
        ? await api.schedules.update(schedule.id, { payload: nextPayload, timezone, recurrence } as any)
        : await api.schedules.create({ action_id: action!, payload: nextPayload, timezone, recurrence } as any);
      dispatch('save', { schedule: saved });
    } catch (e: any) { error = e.message; }
    finally { saving = false; }
  }
</script>

<div class={`incld-builder ${className}`} style={configStyle}>
  <header>
    <div><h3>{resolvedTitle}</h3><p>{actionName || description}</p></div>
  </header>

  <div class="body">
    <section>
      <label>{frequencyLabel}</label>
      <div class="frequency-grid">
        {#each ['once', 'daily', 'weekly', 'monthly'] as option}
          <slot name="frequencyOption" value={option} label={option[0].toUpperCase() + option.slice(1)} selected={frequency === option} select={() => frequency = option as any}>
            <button type="button" class:active={frequency === option} on:click={() => frequency = option as any}>{option[0].toUpperCase() + option.slice(1)}</button>
          </slot>
        {/each}
      </div>
    </section>

    <section class:monthly-day-mode={monthlyDayMode} class="mode-panel">
      {#if frequency === 'weekly'}
        <label>{weekdaysLabel}</label>
        <div class="weekday-grid">
          {#each weekdays as day}
            <slot name="weekday" day={day.value} label={day.label} selected={selectedWeekdays.includes(day.value)} toggle={() => toggleWeekday(day.value)}>
              <button type="button" class:active={selectedWeekdays.includes(day.value)} on:click={() => toggleWeekday(day.value)}>{day.label}</button>
            </slot>
          {/each}
        </div>
      {:else if frequency === 'monthly'}
        <label>{monthlyLabel}</label>
        <div class="monthly-grid">
          {#each monthlyOptions as option}
            <slot name="monthlyOption" value={option[0]} label={option[1]} selected={monthlyMode === option[0]} select={() => monthlyMode = option[0]}>
              <button type="button" class:active={monthlyMode === option[0]} on:click={() => monthlyMode = option[0]}>{option[1]}</button>
            </slot>
          {/each}
        </div>
        {#if monthlyMode === 'day_of_month'}
          <div class="inline-control"><span>Run on day</span><slot name="input" kind="day_of_month" label="Run on day" value={dayOfMonth} type="number" min={1} max={31} onChange={setDay}><input type="number" min="1" max="31" value={dayOfMonth} on:input={(event) => setDay(event.currentTarget.value)} /></slot></div>
        {/if}
      {:else if frequency === 'once'}
        <label>{onceLabel}</label><slot name="input" kind="date" label="Date" value={date} type="date" onChange={(value: string) => date = value}><input type="date" bind:value={date} /></slot>
      {:else}
        <label>{dailyLabel}</label><p>Runs every day at the time you choose below.</p>
      {/if}
    </section>

    <section class="two-col">
      <div><label>{timeLabel}</label><slot name="input" kind="time" label={timeLabel} value={localTime} type="time" onChange={(value: string) => localTime = value}><input type="time" bind:value={localTime} /></slot></div>
      <div><label>{timezoneLabel}</label><slot name="timezoneInput" label={timezoneLabel} value={timezone} onChange={(value: string) => timezone = value}><input type="text" bind:value={timezone} /></slot></div>
    </section>

    <section class="ends">
      <label>{endsLabel}</label>
      <div class="end-grid">
        {#each [['never','Never'],['after_occurrences','After runs'],['on_date','On date']] as option}
          <slot name="endOption" value={option[0]} label={option[1]} selected={endCondition.type === option[0]} select={() => setEndType(option[0] as any)}>
            <button type="button" class:active={endCondition.type === option[0]} on:click={() => setEndType(option[0] as any)}>{option[1]}</button>
          </slot>
        {/each}
      </div>
      {#if endCondition.type === 'after_occurrences'}
        <div class="inline-control"><span>Number of runs</span><slot name="input" kind="end_count" label="Number of runs" value={endCondition.count} type="number" min={1} onChange={setOccurrenceCount}><input type="number" min="1" value={endCondition.count} on:input={(event) => setOccurrenceCount(event.currentTarget.value)} /></slot></div>
      {:else if endCondition.type === 'on_date'}
        <div class="inline-control"><span>End date</span><slot name="input" kind="end_date" label="End date" value={endCondition.date} type="date" onChange={setEndDate}><input type="date" value={endCondition.date} on:input={(event) => setEndDate(event.currentTarget.value)} /></slot></div>
      {/if}
    </section>

    <section class="summary"><small>{summaryLabel}</small><strong>{preview?.summary || 'Calculating schedule…'}</strong></section>
    <section class="preview">
      <div class="preview-title"><span>{previewTitle}</span>{#if previewLoading}<small>Updating…</small>{/if}</div>
      {#if previewError}<p class="error">{previewError}</p>
      {:else if preview?.occurrences.length}
        {#each preview.occurrences as occurrence (occurrence.utc)}
          <slot name="previewRow" {occurrence}><div class="preview-row"><span>{occurrence.label}</span><small>{occurrence.timezone_abbreviation}</small></div></slot>
        {/each}
      {:else}<p>No upcoming runs for this schedule.</p>{/if}
    </section>
    {#if error}<p class="error">{error}</p>{/if}
  </div>

  <footer>
    <slot name="cancelButton" label={cancelLabel} cancel={() => dispatch('cancel')}><button type="button" class="ghost" on:click={() => dispatch('cancel')}>{cancelLabel}</button></slot>
    <slot name="saveButton" label={saving ? 'Saving…' : resolvedSaveLabel} disabled={saving || !valid} save={handleSave}><button type="button" class="primary" on:click={handleSave} disabled={saving || !valid}>{saving ? 'Saving…' : resolvedSaveLabel}</button></slot>
  </footer>
</div>

<style>
  .incld-builder{--incld-accent:#e7e7e2;--incld-accent-text:#181818;--incld-surface:#1f1f1f;--incld-header-surface:#1b1b1b;--incld-raised-surface:#292929;--incld-dark-surface:#181818;--incld-border:rgba(127,127,127,.18);--incld-overlay:rgba(127,127,127,.07);--incld-overlay-hover:rgba(127,127,127,.12);--incld-text:#f5f5f2;--incld-text-muted:#aaa;--incld-text-faint:#777;--incld-danger-text:#d78b8b;width:100%;height:var(--incld-builder-height,580px);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;color:var(--incld-text);background:var(--incld-surface);border:1px solid var(--incld-border);border-radius:var(--incld-builder-radius,12px);font-family:var(--incld-font-family,system-ui,-apple-system,sans-serif)}header,footer{flex:none;padding:var(--incld-builder-header-padding,.8rem 1rem);background:var(--incld-header-surface);border-color:var(--incld-border);display:flex;align-items:center;justify-content:space-between;gap:1rem}header{border-bottom:1px solid var(--incld-border);align-items:flex-start}footer{padding:var(--incld-builder-footer-padding,.7rem 1rem);border-top:1px solid var(--incld-border);justify-content:flex-end}header h3{margin:0;font-size:.875rem}header p,header span{margin:.1rem 0 0;color:var(--incld-text-muted);font-size:.75rem}.body{flex:1;min-height:0;overflow:auto;padding:var(--incld-builder-body-padding,.9rem 1rem);display:flex;flex-direction:column;gap:.8rem}label{display:block;margin-bottom:.35rem;color:var(--incld-text-muted);font-size:.75rem;font-weight:500}button,input{box-sizing:border-box;font:inherit}.frequency-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem}.frequency-grid button,.weekday-grid button,.monthly-grid button,.end-grid button{padding:.4rem;border:1px solid var(--incld-border);border-radius:var(--incld-control-radius,6px);background:var(--incld-raised-surface);color:var(--incld-text-muted);cursor:pointer}button.active{border-color:var(--incld-accent);color:var(--incld-text)}.weekday-grid button.active{background:var(--incld-accent);color:var(--incld-accent-text)}.mode-panel{min-height:126px;padding:var(--incld-panel-padding,.75rem);border:1px solid var(--incld-border);border-radius:var(--incld-panel-radius,8px);background:var(--incld-raised-surface);box-sizing:border-box}.mode-panel.monthly-day-mode{min-height:158px}.mode-panel p,.preview p{margin:.25rem 0;color:var(--incld-text-muted);font-size:.75rem}.weekday-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.25rem}.monthly-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.35rem}.two-col{display:grid;grid-template-columns:.8fr 1.2fr;gap:.6rem}input{width:100%;min-height:34px;padding:.4rem .55rem;border:1px solid var(--incld-border);border-radius:var(--incld-input-radius,7px);background:var(--incld-raised-surface);color:var(--incld-text)}.ends{padding-top:.7rem;border-top:1px solid var(--incld-border)}.end-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem}.inline-control{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.5rem;color:var(--incld-text-muted);font-size:.75rem}.inline-control input{max-width:12rem}.summary,.preview{padding:var(--incld-panel-padding,.65rem .7rem);border:1px solid var(--incld-border);border-radius:var(--incld-panel-radius,8px);background:var(--incld-overlay)}.summary small{display:block;color:var(--incld-text-muted)}.summary strong{display:block;margin-top:.1rem;font-size:.75rem}.preview-title,.preview-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;font-size:.75rem}.preview-title{margin-bottom:.35rem;color:var(--incld-text-muted)}.preview-row{padding:.2rem 0}.preview-row span{color:var(--incld-text)}.preview-row small,.preview-title small{color:var(--incld-text-faint)}.error{color:var(--incld-danger-text)!important}footer button{padding:var(--incld-action-button-padding,.45rem .75rem);border-radius:var(--incld-control-radius,7px);border:0;cursor:pointer}.ghost{background:transparent;color:var(--incld-text-muted)}.primary{background:var(--incld-accent);color:var(--incld-accent-text);font-weight:600}@media(max-width:640px){.incld-builder{height:640px;max-height:calc(100vh - 1rem)}.two-col{grid-template-columns:1fr}header span{display:none}}
</style>
