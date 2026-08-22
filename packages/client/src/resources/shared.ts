import type {Page} from '../types.js';

export interface PageWire<T> {
  data: T[];
  meta?: {next_cursor?: string | null; has_more?: boolean};
  next_cursor?: string | null;
  has_more?: boolean;
}

export function pageFromWire<Wire, Value>(response: PageWire<Wire>, map: (wire: Wire) => Value): Page<Value> {
  return {
    data: response.data.map(map),
    meta: {
      nextCursor: response.meta?.next_cursor ?? response.next_cursor ?? null,
      hasMore: response.meta?.has_more ?? response.has_more ?? false,
    },
  };
}

export function recurrenceToWire(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {...value as Record<string, unknown>};
  if ('localTime' in result) { result.local_time = result.localTime; delete result.localTime; }
  if ('startsAt' in result) { result.starts_at = result.startsAt; delete result.startsAt; }
  if ('monthlyMode' in result) { result.monthly_mode = result.monthlyMode; delete result.monthlyMode; }
  if ('dayOfMonth' in result) { result.day_of_month = result.dayOfMonth; delete result.dayOfMonth; }
  return result;
}

export function recurrenceFromWire(value: unknown): any {
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {...value as Record<string, unknown>};
  if ('local_time' in result) { result.localTime = result.local_time; delete result.local_time; }
  if ('starts_at' in result) { result.startsAt = result.starts_at; delete result.starts_at; }
  if ('monthly_mode' in result) { result.monthlyMode = result.monthly_mode; delete result.monthly_mode; }
  if ('day_of_month' in result) { result.dayOfMonth = result.day_of_month; delete result.day_of_month; }
  return result;
}
