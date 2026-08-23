import {describe, expect, mock, test} from 'bun:test';
import * as crypto from 'crypto';
import {createCoreIntegration, defineActions} from '../src/handler.js';

function signature(secret: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `t=${timestamp},v1=${crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

const options = (fetcher: typeof fetch) => ({
  apiKey: 'sk_test', webhookSecret: 'whsec_test', fetch: fetcher,
  resolveContext: async () => ({user: {id: 'user_trusted'}, organization: {id: 'org_trusted'}, claims: {role: 'admin'}}),
});

describe('framework integration security boundary', () => {
  test('allowlists operations, strips nested identity, and injects trusted context', async () => {
    let forwarded: any;
    const fetcher = mock(async (url, init) => { forwarded = {url: String(url), body: JSON.parse(String(init?.body)), headers: init?.headers}; return Response.json({data: {id: 'sch_1'}}); });
    const integration = createCoreIntegration(options(fetcher as any));
    const response = await integration.routes(new Request('http://app.test/api/incld/v1/schedules', {method: 'POST', body: JSON.stringify({action: 'sync_contacts', external_user_id: 'spoofed', metadata: {actor_id: 'nested'}})}));
    expect(response.status).toBe(200);
    expect(forwarded.url).toBe('https://api.incld.dev/v1/schedules');
    expect(forwarded.body.external_user_id).toBe('user_trusted');
    expect(forwarded.body.external_organization_id).toBe('org_trusted');
    expect(forwarded.headers['Incld-User-Id']).toBe('user_trusted');
    expect(forwarded.headers['Incld-Organization-Id']).toBe('org_trusted');
    expect(forwarded.body.metadata.actor_id).toBeUndefined();
    const denied = await integration.routes(new Request('http://app.test/api/incld/v1/actions', {method: 'POST', body: '{}'}));
    expect(denied.status).toBe(405);
  });

  test('fails closed when a tenant-bound operation has no organization context', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: []})));
    const integration = createCoreIntegration({
      apiKey: 'sk_test',
      webhookSecret: 'whsec_test',
      fetch: fetcher as any,
      resolveContext: async () => ({user: {id: 'user_trusted'}} as any),
    });

    const response = await integration.routes(new Request('http://app.test/api/incld/v1/schedules'));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('organization_context_required');
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('allows stateless recurrence preview without emitting a partial scope header pair', async () => {
    let forwarded: any;
    const fetcher = mock(async (_url, init) => {
      forwarded = init;
      return Response.json({data: {summary: 'Daily', occurrences: []}});
    });
    const integration = createCoreIntegration({
      apiKey: 'sk_test',
      webhookSecret: 'whsec_test',
      fetch: fetcher as any,
      resolveContext: async () => ({user: {id: 'user_trusted'}} as any),
    });

    const response = await integration.routes(new Request('http://app.test/api/incld/v1/schedules/preview', {
      method: 'POST',
      body: JSON.stringify({recurrence: {frequency: 'daily', timezone: 'UTC'}}),
    }));

    expect(response.status).toBe(200);
    expect(forwarded.headers['Incld-User-Id']).toBeUndefined();
    expect(forwarded.headers['Incld-Organization-Id']).toBeUndefined();
  });

  test('requires explicit host authorization for privileged organization resources', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: []})));
    const integration = createCoreIntegration(options(fetcher as any));

    const response = await integration.routes(new Request('http://app.test/api/incld/v1/bulk-operations'));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('authorization_required');
    expect(fetcher).not.toHaveBeenCalled();

    const policyResponse = await integration.routes(new Request('http://app.test/api/incld/v1/approval-policies'));
    expect(policyResponse.status).toBe(403);
    expect((await policyResponse.json()).error.code).toBe('authorization_required');
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('allows explicitly authorized policy management inside the trusted organization', async () => {
    let forwarded: any;
    const authorize = mock(() => true);
    const fetcher = mock(async (url, init) => {
      forwarded = {url: String(url), body: JSON.parse(String(init?.body)), headers: init?.headers};
      return Response.json({data: {id: 'policy_1'}});
    });
    const integration = createCoreIntegration({...options(fetcher as any), authorize});

    const response = await integration.routes(new Request('http://app.test/api/incld/v1/approval-policies', {
      method: 'POST',
      body: JSON.stringify({resource_pattern: 'release:*', external_organization_id: 'spoofed'}),
    }));

    expect(response.status).toBe(200);
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({operation: 'approval_policies.create'}));
    expect(forwarded.body.external_organization_id).toBe('org_trusted');
    expect(forwarded.headers['Incld-Organization-Id']).toBe('org_trusted');
  });

  test('binds approval roles to context and keeps all-view authorization explicit', async () => {
    const calls: any[] = [];
    const fetcher = mock(async (url, init) => { calls.push({url: String(url), body: init?.body && JSON.parse(String(init.body))}); return Response.json({data: []}); });
    const integration = createCoreIntegration(options(fetcher as any));
    await integration.routes(new Request('http://app.test/api/incld/v1/approvals?view=assigned&approver_id=spoofed'));
    await integration.routes(new Request('http://app.test/api/incld/v1/approvals/apr_1/decisions', {method: 'POST', body: JSON.stringify({decision: 'approved', approver_id: 'spoofed'})}));
    expect(calls[0].url).toContain('approver_id=user_trusted');
    expect(calls[0].url).not.toContain('spoofed');
    expect(calls[1].body.approver_id).toBe('user_trusted');
  });

  test('keeps proxy and signed webhook handlers separate', async () => {
    const run = mock(async () => {});
    const integration = createCoreIntegration({...options(mock(() => Promise.resolve(Response.json({data: {}}))) as any), actions: defineActions({sync_contacts: {run}})});
    const body = JSON.stringify({id: 'evt_1', type: 'run.created', created_at: new Date().toISOString(), data: {run: {id: 'run_1', schedule_id: 'sch_1', action: {identifier: 'sync_contacts'}, payload_snapshot: {segment: 'active'}}}});
    const response = await integration.webhook(new Request('http://app.test/api/incld-webhook', {method: 'POST', headers: {'incld-signature': signature('whsec_test', body)}, body}));
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].event.idempotencyKey).toBe('evt_1');
    expect(run.mock.calls[0][0].payload).toEqual({segment: 'active'});
    const proxyAttempt = await integration.routes(new Request('http://app.test/api/incld/webhook', {method: 'POST', body}));
    expect(proxyAttempt.status).not.toBe(200);
  });

  test('scopes the server client passed to action delivery handlers', async () => {
    let deliveredHeaders: Record<string, string> | undefined;
    const fetcher = mock(async (_url, init) => {
      deliveredHeaders = init?.headers as Record<string, string>;
      return Response.json({data: [], meta: {has_more: false, next_cursor: null}});
    });
    const run = mock(async ({client}) => {
      await client.schedules.list();
    });
    const integration = createCoreIntegration({
      ...options(fetcher as any),
      actions: defineActions({sync_contacts: {run}}),
    });
    const body = JSON.stringify({
      id: 'evt_scoped',
      type: 'run.created',
      created_at: new Date().toISOString(),
      data: {
        context: {organization_id: 'org_delivery', user_id: 'user_delivery'},
        run: {
          id: 'run_1',
          schedule_id: 'sch_1',
          action: {identifier: 'sync_contacts'},
          payload_snapshot: {},
        },
      },
    });

    const response = await integration.webhook(new Request('http://app.test/api/incld-webhook', {
      method: 'POST',
      headers: {'incld-signature': signature('whsec_test', body)},
      body,
    }));

    expect(response.status).toBe(200);
    expect(deliveredHeaders?.['Incld-Organization-Id']).toBe('org_delivery');
    expect(deliveredHeaders?.['Incld-User-Id']).toBe('user_delivery');
  });

  test('syncActions is explicit and idempotent at the platform API', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: {id: 'act_1', identifier: 'sync_contacts', display_name: 'Sync contacts', payload_schema: {}, configuration: {}, inserted_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'}})));
    const integration = createCoreIntegration({...options(fetcher as any), actions: defineActions({sync_contacts: {displayName: 'Sync contacts', run: async () => {}}})});
    await integration.syncActions();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({identifier: 'sync_contacts', display_name: 'Sync contacts'});
  });
});
