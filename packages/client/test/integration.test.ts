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
    const fetcher = mock(async (url, init) => { forwarded = {url: String(url), body: JSON.parse(String(init?.body))}; return Response.json({data: {id: 'sch_1'}}); });
    const integration = createCoreIntegration(options(fetcher as any));
    const response = await integration.routes(new Request('http://app.test/api/incld/v1/schedules', {method: 'POST', body: JSON.stringify({action: 'sync_contacts', external_user_id: 'spoofed', metadata: {actor_id: 'nested'}})}));
    expect(response.status).toBe(200);
    expect(forwarded.url).toBe('https://api.incld.dev/v1/schedules');
    expect(forwarded.body.external_user_id).toBe('user_trusted');
    expect(forwarded.body.external_organization_id).toBe('org_trusted');
    expect(forwarded.body.metadata.actor_id).toBeUndefined();
    const denied = await integration.routes(new Request('http://app.test/api/incld/v1/actions', {method: 'POST', body: '{}'}));
    expect(denied.status).toBe(405);
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

  test('syncActions is explicit and idempotent at the platform API', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: {id: 'act_1', identifier: 'sync_contacts', display_name: 'Sync contacts', payload_schema: {}, configuration: {}, inserted_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'}})));
    const integration = createCoreIntegration({...options(fetcher as any), actions: defineActions({sync_contacts: {displayName: 'Sync contacts', run: async () => {}}})});
    await integration.syncActions();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({identifier: 'sync_contacts', display_name: 'Sync contacts'});
  });
});
