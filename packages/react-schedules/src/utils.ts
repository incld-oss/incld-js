import type {Recurrence, Schedule} from '@incld/client';

export function recurrenceSummary(recurrence: Recurrence) {
  const time = 'localTime' in recurrence ? recurrence.localTime : '';
  switch (recurrence.frequency) {
    case 'once': return `Once on ${recurrence.date} at ${time}`;
    case 'daily': return `${recurrence.interval === 1 ? 'Daily' : `Every ${recurrence.interval} days`} at ${time}`;
    case 'weekly': return `${recurrence.interval === 1 ? 'Weekly' : `Every ${recurrence.interval} weeks`} on ${recurrence.weekdays.join(', ')} at ${time}`;
    case 'monthly': return `${recurrence.interval === 1 ? 'Monthly' : `Every ${recurrence.interval} months`} at ${time}`;
  }
}

export function scheduleSummary(schedule: Schedule) {
  return `${recurrenceSummary(schedule.recurrence)} · ${schedule.timezone}`;
}

export function formatDate(value: string | null | undefined, locale?: string, timeZone?: string) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short', timeZone}).format(new Date(value));
}
