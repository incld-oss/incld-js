import {ActionsResource} from './resources/actions.js';
import {ApprovalPoliciesResource, ApprovalsResource} from './resources/approvals.js';
import {AuditResource} from './resources/audit.js';
import {BulkResource} from './resources/bulk.js';
import {RunsResource} from './resources/runs.js';
import {SchedulesResource} from './resources/schedules.js';
import {SessionsResource} from './resources/sessions.js';
import {
  AuthenticationError,
  ForbiddenError,
  IncldError,
  NotFoundError,
  ValidationError,
  type IncldFieldErrors,
} from './errors.js';
import type {RequestOptions} from './types.js';

export interface IncldOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export interface IncldBrowserOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export interface RequestClient {
  _request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: object,
    options?: RequestOptions,
  ): Promise<T>;
}

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fields?: IncldFieldErrors;
    request_id?: string;
  } | string;
  code?: string;
  message?: string;
  errors?: IncldFieldErrors;
};

abstract class BaseClient implements RequestClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly schedules: SchedulesResource;
  readonly actions: ActionsResource;
  readonly sessions: SessionsResource;
  readonly runs: RunsResource;
  readonly approvals: ApprovalsResource;
  readonly approvalPolicies: ApprovalPoliciesResource;
  readonly auditEvents: AuditResource;
  readonly bulkOperations: BulkResource;
  /** @deprecated Use auditEvents. */
  readonly audit: AuditResource;
  /** @deprecated Use bulkOperations. */
  readonly bulk: BulkResource;

  private readonly fetcher: typeof globalThis.fetch;

  protected constructor(baseUrl: string, timeoutMs: number, fetcher?: typeof globalThis.fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.fetcher = fetcher ?? globalThis.fetch?.bind(globalThis);
    if (!this.fetcher) throw new Error('A Fetch API implementation is required.');

    this.schedules = new SchedulesResource(this);
    this.actions = new ActionsResource(this);
    this.sessions = new SessionsResource(this);
    this.runs = new RunsResource(this);
    this.approvals = new ApprovalsResource(this);
    this.approvalPolicies = new ApprovalPoliciesResource(this);
    this.auditEvents = new AuditResource(this);
    this.bulkOperations = new BulkResource(this);
    this.audit = this.auditEvents;
    this.bulk = this.bulkOperations;
  }

  protected abstract authenticationHeaders(): Record<string, string>;
  protected abstract customHeaders(options?: RequestOptions): Record<string, string>;

  async _request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: object,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.url(path, query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('Request timed out')), this.timeoutMs);
    const onAbort = () => controller.abort(options?.signal?.reason);
    options?.signal?.addEventListener('abort', onAbort, {once: true});

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.authenticationHeaders(),
      ...this.customHeaders(options),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    try {
      const response = await this.fetcher(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) throw await this.errorFromResponse(response);
      if (response.status === 204) return undefined as T;
      return await response.json() as T;
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  private url(path: string, query?: object): string {
    const prefix = this.baseUrl.endsWith('/v1') ? this.baseUrl : `${this.baseUrl}/v1`;
    const value = `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
    const url = new URL(value, typeof window === 'undefined' ? 'http://incld.local' : window.location.origin);

    for (const [key, item] of Object.entries(query ?? {})) {
      if (item === undefined || item === null || item === '') continue;
      if (Array.isArray(item)) item.forEach(entry => url.searchParams.append(key, String(entry)));
      else url.searchParams.set(key, String(item));
    }

    return /^https?:\/\//.test(value) ? url.toString() : `${url.pathname}${url.search}`;
  }

  private async errorFromResponse(response: Response): Promise<IncldError> {
    const body = await response.json().catch(() => ({})) as ErrorBody;
    const nested = typeof body.error === 'object' && body.error !== null ? body.error : undefined;
    const message = nested?.message ?? body.message ?? (typeof body.error === 'string' ? body.error : response.statusText);
    const code = nested?.code ?? body.code ?? 'unknown_error';
    const fields = nested?.fields ?? body.errors;
    const requestId = nested?.request_id ?? response.headers.get('x-request-id') ?? undefined;

    if (response.status === 401) return new AuthenticationError(message, response.status, code, requestId);
    if (response.status === 403) return new ForbiddenError(message, response.status, code, requestId);
    if (response.status === 404) return new NotFoundError(message, response.status, code, requestId);
    if (response.status === 422) return new ValidationError(message, response.status, code, fields, requestId);
    return new IncldError(message, {status: response.status, code, fields, requestId});
  }
}

export class Incld extends BaseClient {
  readonly apiKey: string;

  constructor(options: IncldOptions) {
    if (!options?.apiKey) throw new Error('Incld requires an apiKey.');
    super(options.baseUrl ?? 'https://api.incld.dev', options.timeoutMs ?? 10_000, options.fetch);
    this.apiKey = options.apiKey;
  }

  protected authenticationHeaders() { return {Authorization: `Bearer ${this.apiKey}`}; }
  protected customHeaders(options?: RequestOptions) { return options?.headers ?? {}; }
}

export class IncldBrowser extends BaseClient {
  constructor(options: IncldBrowserOptions = {}) {
    const baseUrl = options.baseUrl ?? '/api/incld';
    if (/^https?:\/\//.test(baseUrl)) {
      throw new Error('IncldBrowser requires a same-origin relative baseUrl.');
    }
    super(baseUrl, options.timeoutMs ?? 10_000, options.fetch);
  }

  protected authenticationHeaders() { return {}; }
  protected customHeaders() { return {}; }
}

/** @deprecated Use Incld. */
export const IncldClient = Incld;
/** @deprecated Use Incld. */
export const Client = Incld;
/** @deprecated Use Incld. */
export const ScheduleKit = Incld;
export type IncldClientOptions = IncldOptions;
export type ScheduleKitOptions = IncldOptions;
