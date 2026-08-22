import {Incld} from './client.js';
import {verifyWebhookSignature} from './webhook.js';
import type {WebhookEvent} from './types.js';

export type MaybePromise<T> = T | Promise<T>;

export interface IncldContext {
  user: {id: string};
  organization?: {id: string};
  roles?: string[];
  permissions?: string[];
  claims?: Record<string, unknown>;
}

export type IncldContextFragment = Partial<Omit<IncldContext, 'user'>> & {user?: IncldContext['user']};

export type IncldContextResolver<Context extends IncldContext = IncldContext, Native = unknown> =
  (request: Request, native?: Native) => MaybePromise<Context | null>;

export interface IncldActionEvent extends WebhookEvent {
  idempotencyKey: string;
  scheduleId?: string;
  runId?: string;
  context?: Record<string, unknown>;
}

export interface IncldActionInput<Payload = Record<string, unknown>> {
  action: string;
  payload: Payload;
  event: IncldActionEvent;
  request: Request;
  client: Incld;
}

export type IncldActionHandler<Payload = Record<string, unknown>> =
  (input: IncldActionInput<Payload>) => MaybePromise<void>;

export interface IncldActionDefinition<Payload = Record<string, unknown>> {
  displayName?: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  run: IncldActionHandler<Payload>;
}

export type IncldActions = Record<string, IncldActionDefinition<any>>;

export function defineAction<Payload, Definition extends IncldActionDefinition<Payload>>(definition: Definition) {
  return definition;
}

export function defineActions<Actions extends IncldActions>(actions: Actions): Actions;
export function defineActions(...groups: IncldActions[]): IncldActions;
export function defineActions(...groups: IncldActions[]): IncldActions {
  return Object.assign({}, ...groups);
}

export function composeContext<Native = unknown>(
  ...resolvers: Array<(request: Request, native?: Native) => MaybePromise<IncldContextFragment | null>>
): IncldContextResolver<IncldContext, Native> {
  return async (request, native) => {
    let context: IncldContext | null = null;
    for (const resolver of resolvers) {
      const value = await resolver(request, native);
      if (!value) return null;
      const current = context as IncldContext | null;
      context = current ? {
        ...current,
        ...value,
        user: value.user ?? current.user,
        organization: value.organization ?? current.organization,
        roles: [...new Set([...(current.roles ?? []), ...(value.roles ?? [])])],
        permissions: [...new Set([...(current.permissions ?? []), ...(value.permissions ?? [])])],
        claims: {...(current.claims ?? {}), ...(value.claims ?? {})},
      } : value as IncldContext;
    }
    return context?.user?.id ? context : null;
  };
}

export interface IncldAuthorizationInput<Context extends IncldContext = IncldContext> {
  context: Context;
  operation: string;
  resource: string;
  request: Request;
}

export interface CreateIncldOptions<Context extends IncldContext = IncldContext, Native = unknown> {
  apiKey: string;
  webhookSecret: string;
  resolveContext: IncldContextResolver<Context, Native>;
  authorize?: (input: IncldAuthorizationInput<Context>) => MaybePromise<boolean>;
  actions?: IncldActions;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export type ProxyOperation = {method: string; pattern: RegExp; operation: string; resource: string};

const operations: ProxyOperation[] = [
  {method: 'GET', pattern: /^\/actions(?:\/[^/]+)?$/, operation: 'actions.read', resource: 'actions'},
  {method: 'GET', pattern: /^\/schedules(?:\/[^/]+)?$/, operation: 'schedules.read', resource: 'schedules'},
  {method: 'POST', pattern: /^\/schedules$/, operation: 'schedules.create', resource: 'schedules'},
  {method: 'POST', pattern: /^\/schedules\/preview$/, operation: 'schedules.preview', resource: 'schedules'},
  {method: 'PATCH', pattern: /^\/schedules\/[^/]+$/, operation: 'schedules.update', resource: 'schedules'},
  {method: 'DELETE', pattern: /^\/schedules\/[^/]+$/, operation: 'schedules.delete', resource: 'schedules'},
  {method: 'POST', pattern: /^\/schedules\/[^/]+\/(pause|resume)$/, operation: 'schedules.control', resource: 'schedules'},
  {method: 'GET', pattern: /^\/schedules\/[^/]+\/(runs|events)$/, operation: 'schedules.history', resource: 'schedules'},
  {method: 'GET', pattern: /^\/runs(?:\/[^/]+)?$/, operation: 'runs.read', resource: 'runs'},
  {method: 'GET', pattern: /^\/approvals(?:\/[^/]+)?$/, operation: 'approvals.read', resource: 'approvals'},
  {method: 'POST', pattern: /^\/approvals$/, operation: 'approvals.create', resource: 'approvals'},
  {method: 'POST', pattern: /^\/approvals\/check$/, operation: 'approvals.check', resource: 'approvals'},
  {method: 'PATCH', pattern: /^\/approvals\/[^/]+$/, operation: 'approvals.update', resource: 'approvals'},
  {method: 'DELETE', pattern: /^\/approvals\/[^/]+$/, operation: 'approvals.delete', resource: 'approvals'},
  {method: 'POST', pattern: /^\/approvals\/[^/]+\/(decisions|cancel|revoke)$/, operation: 'approvals.decide', resource: 'approvals'},
  {method: 'GET', pattern: /^\/approvals\/[^/]+\/events$/, operation: 'approvals.history', resource: 'approvals'},
  {method: 'GET', pattern: /^\/approval-policies(?:\/[^/]+)?$/, operation: 'approval_policies.read', resource: 'approval-policies'},
  {method: 'POST', pattern: /^\/approval-policies$/, operation: 'approval_policies.create', resource: 'approval-policies'},
  {method: 'PATCH', pattern: /^\/approval-policies\/[^/]+$/, operation: 'approval_policies.update', resource: 'approval-policies'},
  {method: 'DELETE', pattern: /^\/approval-policies\/[^/]+$/, operation: 'approval_policies.delete', resource: 'approval-policies'},
  {method: 'GET', pattern: /^\/audit-events(?:\/[^/]+)?$/, operation: 'audit.read', resource: 'audit-events'},
  {method: 'POST', pattern: /^\/audit-events$/, operation: 'audit.create', resource: 'audit-events'},
  {method: 'GET', pattern: /^\/bulk-operations(?:\/[^/]+)?$/, operation: 'bulk.read', resource: 'bulk-operations'},
  {method: 'GET', pattern: /^\/bulk-operations\/[^/]+\/(chunks|events)$/, operation: 'bulk.read', resource: 'bulk-operations'},
  {method: 'POST', pattern: /^\/bulk-operations\/[^/]+\/cancel$/, operation: 'bulk.cancel', resource: 'bulk-operations'},
  {method: 'POST', pattern: /^\/sessions$/, operation: 'sessions.create', resource: 'sessions'},
];

/** Resolves the trusted authorization contract for a normalized v1 API path. */
export function resolveProxyOperation(method: string, path: string): ProxyOperation | undefined {
  return operations.find(item => item.method === method.toUpperCase() && item.pattern.test(path));
}

const protectedKeys = new Set([
  'external_user_id', 'external_organization_id', 'requester_id', 'approver_id',
  'actor_id', 'viewer_id', 'user_id', 'organization_id',
]);

function stripProtected(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProtected);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !protectedKeys.has(key))
      .map(([key, child]) => [key, stripProtected(child)]),
  );
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({error: {code, message}}, {status});
}

function apiPath(pathname: string): string | null {
  const version = pathname.lastIndexOf('/v1/');
  if (version >= 0) return pathname.slice(version + 3);
  if (pathname.endsWith('/v1')) return '/';
  return null;
}

function injectContext(
  path: string,
  method: string,
  query: URLSearchParams,
  body: Record<string, any>,
  context: IncldContext,
) {
  for (const key of protectedKeys) query.delete(key);
  const userId = context.user.id;
  const organizationId = context.organization?.id;

  if (path.startsWith('/schedules') || path.startsWith('/runs')) {
    if (method === 'GET') query.set('external_user_id', userId);
    else {
      body.external_user_id = userId;
      if (organizationId) body.external_organization_id = organizationId;
    }
  }

  if (path.startsWith('/approvals')) {
    if (method === 'GET' && path === '/approvals') {
      const view = query.get('view') ?? 'requested';
      query.delete('view');
      if (view === 'assigned') query.set('approver_id', userId);
      else if (view !== 'all') query.set('requester_id', userId);
    } else if (path === '/approvals/check') body.requester_id = userId;
    else if (method === 'POST' && path === '/approvals') body.requester_id = userId;
    else if (/\/decisions$/.test(path)) body.approver_id = userId;
    else if (/\/(cancel|revoke)$/.test(path)) body.actor_id = userId;
  }

  if (path.startsWith('/audit-events')) {
    if (method === 'GET') query.set('viewer_id', userId);
    else body.actor_id = userId;
  }

  if (path.startsWith('/bulk-operations') && /\/cancel$/.test(path)) body.actor_id = userId;

  if (path === '/sessions') {
    body.claims = {
      ...(body.claims && typeof body.claims === 'object' ? body.claims : {}),
      ...context.claims,
      user_id: userId,
      ...(organizationId ? {organization_id: organizationId} : {}),
    };
  }
}

function actionFromEvent(event: WebhookEvent) {
  const data = event.data as any;
  if (event.type === 'run.created' && data?.run) {
    const run = data.run;
    const identifier = run.action?.identifier ?? run.action_identifier ?? run.schedule?.action?.identifier;
    if (!identifier) return null;
    return {
      identifier,
      payload: run.schedule?.payload ?? run.payload_snapshot ?? {},
      scheduleId: run.schedule_id ?? run.schedule?.id,
      runId: run.id,
      context: data.context,
    };
  }
  if (event.type === 'bulk.chunk' && data?.operation && data?.chunk) {
    return {
      identifier: data.operation.action,
      payload: {
        operationId: data.operation.id,
        chunkId: data.chunk.id,
        chunkIndex: data.chunk.index,
        items: data.chunk.items ?? [],
        metadata: data.operation.metadata ?? {},
      },
      context: data.context,
    };
  }
  return null;
}

function humanize(identifier: string) {
  return identifier.split(/[_-]+/).filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function createCoreIntegration<Context extends IncldContext = IncldContext, Native = unknown>(
  options: CreateIncldOptions<Context, Native>,
) {
  if (!options.webhookSecret) throw new Error('createIncld requires a webhookSecret.');
  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) throw new Error('A Fetch API implementation is required.');
  const client = new Incld({apiKey: options.apiKey, baseUrl: options.baseUrl, fetch: options.fetch});

  const syncActions = async () => {
    await Promise.all(Object.entries(options.actions ?? {}).map(([identifier, action]) =>
      client.actions.define({
        identifier,
        displayName: action.displayName ?? humanize(identifier),
        description: action.description,
        payloadSchema: action.payloadSchema,
        configuration: action.configuration,
      }),
    ));
  };

  const routes = async (request: Request, native?: Native): Promise<Response> => {
    const incoming = new URL(request.url, 'http://incld.local');
    const path = apiPath(incoming.pathname);
    if (!path) return errorResponse(404, 'route_not_found', 'No INCLD API route matched this request.');

    const operation = resolveProxyOperation(request.method, path);
    if (!operation) return errorResponse(405, 'operation_not_allowed', 'This operation is not available through the browser proxy.');

    const context = await options.resolveContext(request, native);
    if (!context?.user?.id) return errorResponse(401, 'context_required', 'An authenticated application context is required.');
    if (options.authorize && !(await options.authorize({...operation, context, request}))) {
      return errorResponse(403, 'context_forbidden', 'The application denied this operation.');
    }

    let body: Record<string, any> = {};
    if (!['GET', 'HEAD'].includes(request.method)) {
      const text = await request.text();
      if (text) {
        try { body = stripProtected(JSON.parse(text)) as Record<string, any>; }
        catch { return errorResponse(400, 'invalid_json', 'The request body must be valid JSON.'); }
      }
    }
    injectContext(path, request.method, incoming.searchParams, body, context);

    const base = (options.baseUrl ?? 'https://api.incld.dev').replace(/\/$/, '').replace(/\/v1$/, '');
    const target = new URL(`${base}/v1${path}`);
    incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    };
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (!['GET', 'HEAD'].includes(request.method)) headers['Content-Type'] = 'application/json';

    const response = await fetcher(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(body),
      signal: request.signal,
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'x-request-id']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, {status: response.status, headers: responseHeaders});
  };

  const webhook = async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'Webhooks require POST.');
    const signature = request.headers.get('incld-signature') ?? request.headers.get('webhook-signature');
    if (!signature) return errorResponse(401, 'signature_required', 'The webhook signature is required.');
    const rawBody = await request.text();
    if (!(await verifyWebhookSignature(rawBody, signature, options.webhookSecret))) {
      return errorResponse(401, 'signature_invalid', 'The webhook signature is invalid.');
    }

    let event: WebhookEvent;
    try { event = JSON.parse(rawBody) as WebhookEvent; }
    catch { return errorResponse(400, 'invalid_json', 'The webhook body must be valid JSON.'); }

    const action = actionFromEvent(event);
    if (action) {
      const declaration = options.actions?.[action.identifier];
      if (!declaration) return errorResponse(422, 'action_not_declared', `No handler is declared for ${action.identifier}.`);
      await declaration.run({
        action: action.identifier,
        payload: action.payload,
        event: {
          ...event,
          idempotencyKey: event.id,
          scheduleId: action.scheduleId,
          runId: action.runId,
          context: action.context,
        },
        request,
        client,
      });
    }
    return Response.json({data: {received: true}});
  };

  return {routes, webhook, syncActions, client};
}

/** Framework adapters should expose createCoreIntegration's separate routes and webhook handlers. */
export const createCoreHandler = createCoreIntegration;
export type HandleIncldOptions<Context extends IncldContext = IncldContext, Native = unknown> =
  CreateIncldOptions<Context, Native>;
export type IncldRequestContext = IncldContext;
