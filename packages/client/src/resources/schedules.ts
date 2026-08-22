import type {RequestClient} from '../client.js';
import type {
  ListSchedulesParams,
  Page,
  PageParams,
  RequestOptions,
  Run,
  Schedule,
  ScheduleInput,
  SchedulePreview,
  SchedulePreviewInput,
  UpdateScheduleInput,
} from '../types.js';
import {auditEventFromWire, type AuditEvent, type AuditEventWire} from './audit.js';
import {runFromWire, type RunWire} from './runs.js';
import {pageFromWire, recurrenceFromWire, recurrenceToWire, type PageWire} from './shared.js';

interface ScheduleWire {
  id: string;
  status: Schedule['status'];
  external_user_id?: string;
  external_organization_id?: string;
  action: {identifier: string; display_name: string};
  payload?: Record<string, unknown>;
  recurrence: unknown;
  timezone: string;
  start_at?: string;
  end_condition?: unknown;
  overlap_policy: Schedule['overlapPolicy'];
  misfire_policy: Schedule['misfirePolicy'];
  next_run_at: string | null;
  last_run_at: string | null;
  revision: number;
  inserted_at: string;
  updated_at: string;
}

const fromWire = (schedule: ScheduleWire): Schedule => ({
  id: schedule.id,
  status: schedule.status,
  externalUserId: schedule.external_user_id,
  externalOrganizationId: schedule.external_organization_id,
  action: {identifier: schedule.action.identifier, displayName: schedule.action.display_name},
  payload: schedule.payload ?? {},
  recurrence: recurrenceFromWire(schedule.recurrence),
  timezone: schedule.timezone,
  startAt: schedule.start_at,
  endCondition: schedule.end_condition as Schedule['endCondition'],
  overlapPolicy: schedule.overlap_policy,
  misfirePolicy: schedule.misfire_policy,
  nextRunAt: schedule.next_run_at,
  lastRunAt: schedule.last_run_at,
  revision: schedule.revision,
  createdAt: schedule.inserted_at,
  updatedAt: schedule.updated_at,
});

function toWire(input: ScheduleInput | UpdateScheduleInput) {
  return {
    action: input.action,
    external_user_id: input.externalUserId,
    external_organization_id: input.externalOrganizationId,
    payload: input.payload,
    recurrence: input.recurrence ? recurrenceToWire(input.recurrence) : undefined,
    timezone: input.timezone,
    overlap_policy: input.overlapPolicy,
    misfire_policy: input.misfirePolicy,
  };
}

export class SchedulesResource {
  constructor(private client: RequestClient) {}

  async list(params?: ListSchedulesParams, options?: RequestOptions): Promise<Page<Schedule>> {
    const response = await this.client._request<PageWire<ScheduleWire>>('GET', '/schedules', undefined, {
      external_user_id: params?.externalUserId,
      action: params?.action,
      status: params?.status,
      limit: params?.limit,
      cursor: params?.cursor,
    }, options);
    return pageFromWire(response, fromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'GET', `/schedules/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  async create(input: ScheduleInput, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'POST', '/schedules', toWire(input), undefined, options,
    );
    return fromWire(response.data);
  }

  async preview(input: SchedulePreviewInput, options?: RequestOptions): Promise<SchedulePreview> {
    const response = await this.client._request<{data: any}>('POST', '/schedules/preview', {
      recurrence: recurrenceToWire(input.recurrence),
      count: input.count,
      from: input.from,
    }, undefined, options);
    return {
      summary: response.data.summary,
      occurrences: (response.data.occurrences ?? []).map((occurrence: any) => ({
        utc: occurrence.utc,
        local: occurrence.local,
        date: occurrence.date,
        time: occurrence.time,
        timezone: occurrence.timezone,
        timezoneAbbreviation: occurrence.timezone_abbreviation,
        label: occurrence.label,
      })),
    };
  }

  async update(id: string, input: UpdateScheduleInput, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'PATCH', `/schedules/${encodeURIComponent(id)}`, toWire(input), undefined, options,
    );
    return fromWire(response.data);
  }

  async remove(id: string, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'DELETE', `/schedules/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  /** @deprecated Use remove. */
  delete(id: string, options?: RequestOptions) { return this.remove(id, options); }

  async pause(id: string, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'POST', `/schedules/${encodeURIComponent(id)}/pause`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  async resume(id: string, options?: RequestOptions): Promise<Schedule> {
    const response = await this.client._request<{data: ScheduleWire}>(
      'POST', `/schedules/${encodeURIComponent(id)}/resume`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  async runs(id: string, params?: PageParams, options?: RequestOptions): Promise<Page<Run>> {
    const response = await this.client._request<PageWire<RunWire>>(
      'GET', `/schedules/${encodeURIComponent(id)}/runs`, undefined, params, options,
    );
    return pageFromWire(response, runFromWire);
  }

  /** @deprecated Use runs. */
  listRuns(id: string, params?: PageParams, options?: RequestOptions) { return this.runs(id, params, options); }

  async events(id: string, params?: PageParams, options?: RequestOptions): Promise<Page<AuditEvent>> {
    const response = await this.client._request<PageWire<AuditEventWire>>(
      'GET', `/schedules/${encodeURIComponent(id)}/events`, undefined, params, options,
    );
    return pageFromWire(response, auditEventFromWire);
  }
}
