import type {RequestClient} from '../client.js';
import type {ListRunsParams, Page, RequestOptions, Run} from '../types.js';
import {pageFromWire, type PageWire} from './shared.js';

export interface RunWire {
  id: string; schedule_id: string; external_user_id?: string;
  action: {identifier: string; display_name: string}; status: Run['status'];
  nominal_at: string; scheduled_at: string; started_at: string | null;
  completed_at: string | null; attempt_count: number;
  payload_snapshot?: Record<string, unknown>; error: string | null;
  response_code?: number; schedule_revision: number; inserted_at: string; updated_at: string;
}

export const runFromWire = (run: RunWire): Run => ({
  id: run.id,
  scheduleId: run.schedule_id,
  externalUserId: run.external_user_id,
  action: {identifier: run.action.identifier, displayName: run.action.display_name},
  status: run.status,
  nominalAt: run.nominal_at,
  scheduledAt: run.scheduled_at,
  startedAt: run.started_at,
  completedAt: run.completed_at,
  attemptCount: run.attempt_count,
  payloadSnapshot: run.payload_snapshot ?? {},
  error: run.error,
  responseCode: run.response_code,
  scheduleRevision: run.schedule_revision,
  createdAt: run.inserted_at,
  updatedAt: run.updated_at,
});

export class RunsResource {
  constructor(private client: RequestClient) {}

  async list(params?: ListRunsParams, options?: RequestOptions): Promise<Page<Run>> {
    const response = await this.client._request<PageWire<RunWire>>('GET', '/runs', undefined, {
      limit: params?.limit,
      cursor: params?.cursor,
      status: params?.status,
      action: params?.action,
      schedule_id: params?.scheduleId,
      external_user_id: params?.externalUserId,
      search: params?.search,
    }, options);
    return pageFromWire(response, runFromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<Run> {
    const response = await this.client._request<{data: RunWire}>(
      'GET', `/runs/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return runFromWire(response.data);
  }
}
