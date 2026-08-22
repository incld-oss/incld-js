# @incld/svelte-schedules

Svelte scheduling components with the same recurrence semantics and neutral customer-facing defaults as the React package.

## Theming

Customer-facing components accept `config`. Keys become `--incld-*` CSS variables and are inherited by the component tree.

```svelte
<script>
  const scheduleTheme = {
    accent: '#8b5cf6',
    accent_text: '#fff',
    surface: '#171717',
    header_surface: '#141414',
    raised_surface: '#242424',
    border: 'rgba(255,255,255,.10)',
    text: '#fafafa',
    text_muted: '#a3a3a3',
    control_bg: '#242424',
    danger_text: '#e7a7a7',
    status_active_text: '#b7d3ba',
  };
</script>

<ScheduleButton config={scheduleTheme} action="sync_contacts" />
<ScheduleList config={scheduleTheme} />
<ScheduleHistory config={scheduleTheme} />
```

The default theme is intentionally restrained. Useful tokens include `accent`, `accent_text`, `surface`, `header_surface`, `raised_surface`, `dark_surface`, `border`, `overlay`, `overlay_hover`, `text`, `text_muted`, `text_faint`, `control_bg`, `control_text`, `control_border`, `danger_text`, `resume_text`, and the `status_*_{text,bg,border}` family.

## Custom trigger and builder

```svelte
<ScheduleButton
  action="sync_contacts"
  builderTitle="Schedule contact sync"
  builderDescription="Choose when contacts should be synchronised."
  previewTitle="Upcoming syncs"
  let:open
>
  <Button slot="trigger" on:click={open}>Schedule sync</Button>
</ScheduleButton>
```

Without a `trigger` slot, `ScheduleButton` renders the neutral INCLD button. A `builder` slot is also available when you want to replace the entire modal body.

## Fine-grained control slots

`ScheduleList` exposes `status`, `pauseButton`, `resumeButton`, and `deleteButton` slots in addition to the full `item` slot:

```svelte
<ScheduleList>
  <StatusPill slot="status" let:schedule let:label status={schedule.status}>
    {label}
  </StatusPill>

  <Button slot="pauseButton" let:controls let:label on:click={controls.pause}>
    {label}
  </Button>

  <DangerButton slot="deleteButton" let:controls let:label on:click={controls.delete}>
    {label}
  </DangerButton>
</ScheduleList>
```

`ScheduleBuilder` exposes named slots for `frequencyOption`, `weekday`, `monthlyOption`, `endOption`, `input`, `timezoneInput`, `previewRow`, `saveButton`, and `cancelButton`.

```svelte
<ScheduleBuilder action="sync_contacts">
  <MyInput
    slot="input"
    let:kind
    let:value
    let:onChange
    data-kind={kind}
    {value}
    on:input={(event) => onChange(event.currentTarget.value)}
  />
</ScheduleBuilder>
```

`ScheduleHistory` exposes `run` and `status`; `ScheduleSummary` exposes the complete default slot plus `status`; `NextRun` exposes its complete default slot. Loading, empty, and error slots remain available where applicable.

## Authoritative previews

The builder debounces calls to `api.schedules.preview(...)`. Upcoming occurrences are calculated server-side by the same timezone-aware engine used for execution, including DST behavior and end conditions.

Default components render human action names rather than schedule/run IDs, and deleted schedules are excluded from `ScheduleList`.
