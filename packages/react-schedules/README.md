# @incld/react-schedules

Customer-facing React components and hooks for durable schedules. Render them inside `IncldProvider` from `@incld/react` and mount the trusted browser proxy first.

```bash
npm install @incld/client @incld/react @incld/react-schedules
```

```tsx
import {ScheduleDetails, ScheduleList, ScheduleTrigger} from '@incld/react-schedules';
import '@incld/react-schedules/styles.css';

<ScheduleTrigger action="sync_contacts" defaultPayload={{segment: 'active'}}>
  Schedule contact sync
</ScheduleTrigger>
<ScheduleList onSelect={schedule => setScheduleId(schedule.id)} />
{scheduleId && <ScheduleDetails scheduleId={scheduleId} />}
```

Browser components do not accept owner identity. The proxy removes supplied identity and derives it from the application session.

## Components

### ScheduleTrigger

Required `action: string`. Optional `defaultPayload`, `defaultSchedule`, `onCreated(schedule)`, `dialogTitle`, `dialogClassName`, `children`, and native button props except `onError`. It opens a `ScheduleComposer` dialog.

### ScheduleComposer

| Prop | Type / behavior |
| --- | --- |
| `action` | Required stable action identifier |
| `payload` | Optional object stored with the schedule |
| `scheduleId` | Loads an existing schedule and defaults to edit mode |
| `initialSchedule` | Seeds edit state without fetching |
| `defaultValue` | `Partial<ScheduleInput>` seed for create mode |
| `mode` | `create | edit`; inferred from `scheduleId` |
| `onSaved` | `(schedule: Schedule) => void` |
| `onCancel` | Renders a Cancel action when supplied |
| `className` | Root form class |
| `classNames` | `{root?, field?, actions?, preview?}` slots |
| `unstyled` | Removes default root/field classes; structural markup remains |

The composer previews five occurrences and currently renders controls for once, daily, weekly, and monthly day-of-month schedules. The client API additionally supports `first_monday`, `last_friday`, `last_day`, starts, and end conditions; use a custom form for those inputs.

### ScheduleList

Props: `filters?: ListSchedulesParams`, `pageSize=25`, `renderItem?(schedule)`, `onSelect?(schedule)`, `className?`, and `loading`/`empty`/`error` async renderers.

### ScheduleDetails

Required `scheduleId`. Optional `onUpdated(schedule)`, `onDeleted(schedule)`, `className`, `loading`, and `error`. It includes edit, pause/resume, and confirmed delete controls.

### RunHistory

Optional `scheduleId`, `filters?: ListRunsParams`, `locale`, `timeZone`, `className`, and async renderers. Without `scheduleId`, it uses the project-wide Run list scoped by the proxy.

### NextRun

Supply `schedule` or `scheduleId`. Optional `format='both'` (`relative | absolute | both`), `locale`, `timeZone`, and `className`. Passing a `schedule` avoids a request.

## Hooks and utilities

- `useSchedules(params?)` → async `Page<Schedule>`.
- `useSchedule(id?)` → async `Schedule | undefined`.
- `useRuns(params?, scheduleId?)` → schedule-specific or project-wide async `Page<Run>`.
- `useSchedulePreview({recurrence}?)` → five canonical occurrences.
- `useScheduleMutation()` → `{pending, error, create(input), update(id, input), pause(id), resume(id), remove(id)}`. Successful mutations refresh provider queries.
- `recurrenceSummary(recurrence)`, `scheduleSummary(schedule)`, and `formatDate(value, locale?, timeZone?)` are exported for custom rows.
