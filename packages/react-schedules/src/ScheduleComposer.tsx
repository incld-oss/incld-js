import React, {useEffect, useId, useMemo, useState, type FormEvent} from 'react';
import type {Recurrence, Schedule, ScheduleInput, Weekday} from '@incld/client';
import {IncldButton} from '@incld/react';
import {useSchedule, useScheduleMutation, useSchedulePreview} from './hooks.js';

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const recurrenceInterval = (value?: Recurrence) => value && 'interval' in value ? value.interval : 1;
const recurrenceDate = (value?: Recurrence) => value && 'date' in value ? value.date : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const recurrenceWeekdays = (value?: Recurrence) => value && 'weekdays' in value ? value.weekdays : ['monday'] as Weekday[];
const recurrenceDayOfMonth = (value?: Recurrence) => value && 'dayOfMonth' in value ? value.dayOfMonth : 1;

export interface ScheduleComposerSlots { root?: string; field?: string; actions?: string; preview?: string }
export interface ScheduleComposerProps {
  action: string;
  payload?: Record<string, unknown>;
  scheduleId?: string;
  initialSchedule?: Schedule;
  defaultValue?: Partial<ScheduleInput>;
  mode?: 'create' | 'edit';
  onSaved?: (schedule: Schedule) => void;
  onCancel?: () => void;
  className?: string;
  classNames?: ScheduleComposerSlots;
  unstyled?: boolean;
}

export function ScheduleComposer({
  action, payload, scheduleId, initialSchedule, defaultValue, mode = scheduleId ? 'edit' : 'create', onSaved,
  onCancel, className = '', classNames = {}, unstyled = false,
}: ScheduleComposerProps) {
  const id = useId();
  const existing = useSchedule(initialSchedule ? undefined : scheduleId);
  const mutation = useScheduleMutation();
  const seed = initialSchedule?.recurrence ?? defaultValue?.recurrence;
  const [frequency, setFrequency] = useState<Recurrence['frequency']>(seed?.frequency ?? 'daily');
  const [interval, setInterval] = useState(recurrenceInterval(seed));
  const [localTime, setLocalTime] = useState('localTime' in (seed ?? {}) ? String(seed?.localTime) : '09:00');
  const [timezone, setTimezone] = useState(initialSchedule?.timezone ?? defaultValue?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC');
  const [date, setDate] = useState(recurrenceDate(seed));
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(recurrenceWeekdays(seed));
  const [dayOfMonth, setDayOfMonth] = useState(recurrenceDayOfMonth(seed));
  const [overlapPolicy, setOverlapPolicy] = useState<'allow' | 'skip'>(initialSchedule?.overlapPolicy ?? defaultValue?.overlapPolicy ?? 'skip');

  useEffect(() => {
    const schedule = existing.data ?? initialSchedule;
    if (!schedule) return;
    setFrequency(schedule.recurrence.frequency);
    setTimezone(schedule.timezone);
    setOverlapPolicy(schedule.overlapPolicy);
    if ('interval' in schedule.recurrence) setInterval(schedule.recurrence.interval);
    if ('localTime' in schedule.recurrence) setLocalTime(schedule.recurrence.localTime);
    if ('weekdays' in schedule.recurrence) setSelectedWeekdays(schedule.recurrence.weekdays);
    if ('date' in schedule.recurrence) setDate(schedule.recurrence.date);
    if ('dayOfMonth' in schedule.recurrence) setDayOfMonth(schedule.recurrence.dayOfMonth);
  }, [existing.data, initialSchedule]);

  const recurrence = useMemo<Recurrence>(() => {
    if (frequency === 'once') return {frequency, date, localTime, timezone};
    if (frequency === 'weekly') return {frequency, interval, weekdays: selectedWeekdays, localTime, timezone};
    if (frequency === 'monthly') return {frequency, interval, monthlyMode: 'day_of_month', dayOfMonth, localTime, timezone};
    return {frequency: 'daily', interval, localTime, timezone};
  }, [date, dayOfMonth, frequency, interval, localTime, selectedWeekdays, timezone]);
  const preview = useSchedulePreview({recurrence});
  const rootClass = unstyled ? className : `incld-schedule-composer ${className}`;
  const fieldClass = unstyled ? classNames.field : `incld-field ${classNames.field ?? ''}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input: ScheduleInput = {action, payload, recurrence, timezone, overlapPolicy};
    try {
      const saved = mode === 'edit' && scheduleId
        ? await mutation.update(scheduleId, input)
        : await mutation.create(input);
      onSaved?.(saved);
    } catch {
      // The mutation hook exposes and reports the normalized error for inline feedback.
    }
  };

  return (
    <form id={`incld-schedule-composer-${id}`} className={`${rootClass} ${classNames.root ?? ''}`} onSubmit={submit}>
      <div className="incld-form-grid">
        <label className={fieldClass}><span>Repeats</span><select className="incld-input" value={frequency} onChange={event => setFrequency(event.target.value as Recurrence['frequency'])}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        {frequency !== 'once' && <label className={fieldClass}><span>Every</span><div className="incld-inline-field"><input className="incld-input" type="number" min={1} max={365} value={interval} onChange={event => setInterval(Number(event.target.value))} /><span>{frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : 'month(s)'}</span></div></label>}
        {frequency === 'once' && <label className={fieldClass}><span>Date</span><input className="incld-input" type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>}
        {frequency === 'monthly' && <label className={fieldClass}><span>Day of month</span><input className="incld-input" type="number" min={1} max={31} required value={dayOfMonth} onChange={event => setDayOfMonth(Number(event.target.value))} /><small>Months without this date use the final calendar day.</small></label>}
        <label className={fieldClass}><span>Time</span><input className="incld-input" type="time" required value={localTime} onChange={event => setLocalTime(event.target.value)} /></label>
        <label className={fieldClass}><span>Timezone</span><input className="incld-input" list={`incld-timezones-${id}`} required value={timezone} onChange={event => setTimezone(event.target.value)} /><datalist id={`incld-timezones-${id}`}><option value="UTC" /><option value="Australia/Melbourne" /><option value="America/New_York" /><option value="Europe/London" /><option value="Asia/Singapore" /></datalist></label>
      </div>
      {frequency === 'weekly' && <fieldset className="incld-weekdays"><legend>On these days</legend>{weekdays.map(day => <label key={day}><input type="checkbox" checked={selectedWeekdays.includes(day)} onChange={() => setSelectedWeekdays(value => value.includes(day) ? value.length === 1 ? value : value.filter(item => item !== day) : [...value, day])} /><span>{day.slice(0, 2)}</span></label>)}</fieldset>}
      <label className={fieldClass}><span>When a previous run is still active</span><select className="incld-input" value={overlapPolicy} onChange={event => setOverlapPolicy(event.target.value as 'allow' | 'skip')}><option value="skip">Skip the overlapping run</option><option value="allow">Start another run</option></select><small>Skipping is safer for actions that should not run concurrently.</small></label>
      <section className={`incld-preview ${classNames.preview ?? ''}`} aria-live="polite"><strong>Next occurrences</strong>{preview.status === 'loading' ? <span>Calculating…</span> : preview.error ? <span>Preview unavailable: {preview.error.message}</span> : <ol>{preview.data?.occurrences.map(item => <li key={item.utc}>{item.label}</li>)}</ol>}</section>
      {mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}
      <div className={`incld-form-actions ${classNames.actions ?? ''}`}>{onCancel && <button type="button" className="incld-button incld-button-secondary" onClick={onCancel}>Cancel</button>}<IncldButton type="submit" busy={mutation.pending}>{mode === 'edit' ? 'Save changes' : 'Create schedule'}</IncldButton></div>
    </form>
  );
}
