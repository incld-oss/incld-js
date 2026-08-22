<script lang="ts">
  import type { Recurrence, Schedule } from '@incld/client';
  import ScheduleBuilder from './ScheduleBuilder.svelte';
  import { createEventDispatcher, getContext } from 'svelte';
  import { INCLD_CONTEXT_KEY, type IncldContextValue } from './context';

  export let action: string;
  export let payload: Record<string, unknown> = {};
  export let config: Record<string, string | number> = {};
  const incldContext = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const globalConfig = incldContext?.config || {};
  export let label: string = 'Schedule';
  export let title: string | undefined = undefined;
  export let builderTitle: string = 'Schedule an action';
  export let builderDescription: string = 'Choose when this action should run.';
  export let builderActionName: string | undefined = undefined;
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
  export let saveLabel: string = 'Save schedule';
  export let cancelLabel: string = 'Cancel';
  export let initialRecurrence: Partial<Recurrence> | undefined = undefined;
  export let className: string = '';
  export let dialogClassName: string = '';
  export let builderClassName: string = '';

  const { updateKey } = getContext<IncldContextValue>(INCLD_CONTEXT_KEY);
  const dispatch = createEventDispatcher();
  let dialog: HTMLDialogElement;
  $: configStyle = Object.entries(config).map(([key, value]) => `--incld-${key.replace(/_/g, '-')}:${value}`).join(';');

  function openDialog() {
    if (!dialog?.open) { dialog?.showModal(); dispatch('open'); }
  }
  function closeDialog() { dialog?.close(); }
  function handleSave(event: CustomEvent<{ schedule: Schedule }>) {
    dispatch('scheduleCreated', event.detail);
    updateKey.update(n => n + 1);
    closeDialog();
  }
</script>

{#if $$slots.trigger}
  <slot name="trigger" open={openDialog} />
{:else}
  <button type="button" {title} aria-haspopup="dialog" class={`incld-button ${className}`} style={configStyle} on:click={openDialog}>
    <slot>{label}</slot>
  </button>
{/if}

<dialog bind:this={dialog} class={`incld-dialog ${dialogClassName}`} style={configStyle} on:close={() => dispatch('close')} on:click={(event) => event.target === event.currentTarget && closeDialog()}>
  <slot name="builder" close={closeDialog}>
    <ScheduleBuilder
      {action}
      {payload}
      {config}
      title={builderTitle}
      description={builderDescription}
      actionName={builderActionName}
      {frequencyLabel}
      {weekdaysLabel}
      {monthlyLabel}
      {onceLabel}
      {dailyLabel}
      {timeLabel}
      {timezoneLabel}
      {endsLabel}
      {summaryLabel}
      {previewTitle}
      {previewCount}
      {saveLabel}
      {cancelLabel}
      {initialRecurrence}
      className={builderClassName}
      on:save={handleSave}
      on:cancel={closeDialog}
    >
      {#if $$slots.frequencyOption}
        <svelte:fragment slot="frequencyOption" let:value let:label let:selected let:select>
          <slot name="frequencyOption" {value} {label} {selected} {select} />
        </svelte:fragment>
      {/if}
      {#if $$slots.weekday}
        <svelte:fragment slot="weekday" let:day let:label let:selected let:toggle>
          <slot name="weekday" {day} {label} {selected} {toggle} />
        </svelte:fragment>
      {/if}
      {#if $$slots.monthlyOption}
        <svelte:fragment slot="monthlyOption" let:value let:label let:selected let:select>
          <slot name="monthlyOption" {value} {label} {selected} {select} />
        </svelte:fragment>
      {/if}
      {#if $$slots.endOption}
        <svelte:fragment slot="endOption" let:value let:label let:selected let:select>
          <slot name="endOption" {value} {label} {selected} {select} />
        </svelte:fragment>
      {/if}
      {#if $$slots.input}
        <svelte:fragment slot="input" let:kind let:label let:value let:type let:min let:max let:onChange>
          <slot name="input" {kind} {label} {value} {type} {min} {max} {onChange} />
        </svelte:fragment>
      {/if}
      {#if $$slots.timezoneInput}
        <svelte:fragment slot="timezoneInput" let:label let:value let:onChange>
          <slot name="timezoneInput" {label} {value} {onChange} />
        </svelte:fragment>
      {/if}
      {#if $$slots.previewRow}
        <svelte:fragment slot="previewRow" let:occurrence>
          <slot name="previewRow" {occurrence} />
        </svelte:fragment>
      {/if}
      {#if $$slots.saveButton}
        <svelte:fragment slot="saveButton" let:label let:disabled let:save>
          <slot name="saveButton" {label} {disabled} {save} />
        </svelte:fragment>
      {/if}
      {#if $$slots.cancelButton}
        <svelte:fragment slot="cancelButton" let:label let:cancel>
          <slot name="cancelButton" {label} {cancel} />
        </svelte:fragment>
      {/if}
    </ScheduleBuilder>
  </slot>
</dialog>

<style>
  .incld-button{--incld-accent:#e7e7e2;--incld-accent-text:#181818;display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .875rem;border:1px solid var(--incld-accent);border-radius:8px;background:var(--incld-accent);color:var(--incld-accent-text);cursor:pointer;font:500 .75rem/1.25rem system-ui,-apple-system,sans-serif}.incld-button:hover{filter:brightness(1.06)}.incld-dialog{width:min(500px,calc(100vw - 2rem));max-width:none;padding:0;margin:0;border:0;border-radius:12px;background:transparent;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);overflow:visible;box-shadow:0 18px 50px rgba(0,0,0,.38)}.incld-dialog::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}
</style>
