import type {RequestClient} from '../client.js';
import type {Page, PageParams, RequestOptions} from '../types.js';
import {pageFromWire, type PageWire} from './shared.js';

export type BulkOperationStatus = 'queued' | 'running' | 'succeeded' | 'completed_with_errors' | 'cancelled';
export type BulkChunkStatus = 'queued' | 'delivering' | 'retrying' | 'succeeded' | 'failed' | 'cancelled';
export interface BulkProgress {
  totalItems: number; totalChunks: number; completedChunks: number; succeededChunks: number;
  failedChunks: number; percentage: number;
}
export interface BulkOperation {
  id: string; projectId: string; action: string; status: BulkOperationStatus;
  metadata: Record<string, unknown>; chunkSize: number; progress: BulkProgress;
  startedAt?: string; completedAt?: string; cancelledAt?: string; createdAt: string; updatedAt: string;
}
export interface BulkChunk<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string; operationId: string; index: number; items: T[]; status: BulkChunkStatus;
  attemptCount: number; responseStatus?: number; responseBody?: string; error?: string;
  startedAt?: string; completedAt?: string; createdAt: string; updatedAt: string;
}
export interface BulkEvent {
  id: string; type: string; actorId?: string; data: Record<string, unknown>; createdAt: string;
}
export interface CreateBulkOperationInput<T extends Record<string, unknown> = Record<string, unknown>> {
  action: string; items: T[]; chunkSize?: number; metadata?: Record<string, unknown>;
}
export interface ListBulkOperationsParams extends PageParams {
  status?: BulkOperationStatus; action?: string;
}
interface OperationWire {
  id: string; project_id: string; action: string; status: BulkOperationStatus;
  metadata?: Record<string, unknown>; chunk_size: number; progress: Record<string, number>;
  started_at?: string; completed_at?: string; cancelled_at?: string;
  inserted_at: string; updated_at: string;
}
interface ChunkWire<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string; operation_id: string; index: number; items: T[]; status: BulkChunkStatus;
  attempt_count: number; response_status?: number; response_body?: string; error?: string;
  started_at?: string; completed_at?: string; inserted_at: string; updated_at: string;
}
interface EventWire {
  id: string; type: string; actor_id?: string; data?: Record<string, unknown>; inserted_at: string;
}

const fromWire = (value: OperationWire): BulkOperation => ({
  id: value.id,
  projectId: value.project_id,
  action: value.action,
  status: value.status,
  metadata: value.metadata ?? {},
  chunkSize: value.chunk_size,
  progress: {
    totalItems: value.progress.total_items,
    totalChunks: value.progress.total_chunks,
    completedChunks: value.progress.completed_chunks,
    succeededChunks: value.progress.succeeded_chunks,
    failedChunks: value.progress.failed_chunks,
    percentage: value.progress.percentage,
  },
  startedAt: value.started_at,
  completedAt: value.completed_at,
  cancelledAt: value.cancelled_at,
  createdAt: value.inserted_at,
  updatedAt: value.updated_at,
});

const chunkFromWire = <T extends Record<string, unknown>>(value: ChunkWire<T>): BulkChunk<T> => ({
  id: value.id,
  operationId: value.operation_id,
  index: value.index,
  items: value.items,
  status: value.status,
  attemptCount: value.attempt_count,
  responseStatus: value.response_status,
  responseBody: value.response_body,
  error: value.error,
  startedAt: value.started_at,
  completedAt: value.completed_at,
  createdAt: value.inserted_at,
  updatedAt: value.updated_at,
});

const eventFromWire = (value: EventWire): BulkEvent => ({
  id: value.id, type: value.type, actorId: value.actor_id, data: value.data ?? {}, createdAt: value.inserted_at,
});

export class BulkResource {
  constructor(private client: RequestClient) {}

  async list(params?: ListBulkOperationsParams, options?: RequestOptions): Promise<Page<BulkOperation>> {
    const response = await this.client._request<PageWire<OperationWire>>(
      'GET', '/bulk-operations', undefined, params, options,
    );
    return pageFromWire(response, fromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<BulkOperation> {
    const response = await this.client._request<{data: OperationWire}>(
      'GET', `/bulk-operations/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  async create<T extends Record<string, unknown>>(
    input: CreateBulkOperationInput<T>,
    options?: RequestOptions,
  ): Promise<BulkOperation> {
    const response = await this.client._request<{data: OperationWire}>('POST', '/bulk-operations', {
      action: input.action,
      items: input.items,
      chunk_size: input.chunkSize,
      metadata: input.metadata,
    }, undefined, options);
    return fromWire(response.data);
  }

  async chunks<T extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    params?: PageParams,
    options?: RequestOptions,
  ): Promise<Page<BulkChunk<T>>> {
    const response = await this.client._request<PageWire<ChunkWire<T>>>(
      'GET', `/bulk-operations/${encodeURIComponent(id)}/chunks`, undefined, params, options,
    );
    return pageFromWire(response, chunkFromWire);
  }

  async events(id: string, params?: PageParams, options?: RequestOptions): Promise<Page<BulkEvent>> {
    const response = await this.client._request<PageWire<EventWire>>(
      'GET', `/bulk-operations/${encodeURIComponent(id)}/events`, undefined, params, options,
    );
    return pageFromWire(response, eventFromWire);
  }

  async cancel(id: string, reason?: string, options?: RequestOptions): Promise<BulkOperation> {
    const response = await this.client._request<{data: OperationWire}>(
      'POST', `/bulk-operations/${encodeURIComponent(id)}/cancel`, {reason}, undefined, options,
    );
    return fromWire(response.data);
  }
}

/** @deprecated Use CreateBulkOperationInput. */
export type CreateBulkOperationParams<T extends Record<string, unknown> = Record<string, unknown>> =
  CreateBulkOperationInput<T>;
