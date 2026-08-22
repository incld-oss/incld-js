import {beforeEach, describe, expect, mock, test} from 'bun:test';
import {Incld, IncldBrowser} from '../src/client.js';
import {ForbiddenError, ValidationError} from '../src/errors.js';

const scheduleWire = {
  id: 'sch_1', status: 'active', external_user_id: 'user_1',
  action: {identifier: 'sync_contacts', display_name: 'Sync contacts'}, payload: {},
  recurrence: {frequency: 'daily', interval: 1, local_time: '09:00', timezone: 'UTC'},
  timezone: 'UTC', overlap_policy: 'skip', misfire_policy: 'run_once',
  next_run_at: null, last_run_at: null, revision: 1,
  inserted_at: '2026-08-20T00:00:00Z', updated_at: '2026-08-20T00:00:00Z',
};

describe('Incld clients', () => {
  beforeEach(() => { global.fetch = mock(() => Promise.resolve(Response.json({data: {ok: true}}))); });

  test('server client authenticates and accepts idempotency and transport options', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: {ok: true}})));
    const client = new Incld({apiKey: 'sk_test', fetch: fetcher});
    await client._request('POST', '/approvals', {resource_id: 'one'}, undefined, {idempotencyKey: 'idem_1', headers: {'X-Test': 'yes'}});
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.incld.dev/v1/approvals');
    expect(init?.headers).toMatchObject({Authorization: 'Bearer sk_test', 'Idempotency-Key': 'idem_1', 'X-Test': 'yes'});
  });

  test('browser client never sends a bearer credential and rejects absolute bases', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({data: [], meta: {has_more: false, next_cursor: null}})));
    const client = new IncldBrowser({baseUrl: '/api/incld', fetch: fetcher});
    await client.schedules.list();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('/api/incld/v1/schedules');
    expect(init?.headers).not.toHaveProperty('Authorization');
    expect(() => new IncldBrowser({baseUrl: 'https://api.incld.dev'})).toThrow('same-origin');
  });

  test('binds the platform fetch implementation to the global browser context', async () => {
    const originalFetch = globalThis.fetch;
    const browserFetch = mock(function(this: typeof globalThis) {
      expect(this).toBe(globalThis);
      return Promise.resolve(Response.json({data: [], meta: {has_more: false, next_cursor: null}}));
    });
    globalThis.fetch = browserFetch as typeof globalThis.fetch;

    try {
      await new IncldBrowser().schedules.list();
      expect(browserFetch).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('maps schedule action identifiers, recurrence, and pages in both directions', async () => {
    const fetcher = mock((_url, init) => Promise.resolve(init?.method === 'POST'
      ? Response.json({data: scheduleWire}, {status: 201})
      : Response.json({data: [scheduleWire], meta: {has_more: true, next_cursor: 'sch_next'}})));
    const client = new Incld({apiKey: 'sk_test', fetch: fetcher});
    const page = await client.schedules.list({limit: 1});
    expect(page.meta).toEqual({hasMore: true, nextCursor: 'sch_next'});
    expect(page.data[0].action.displayName).toBe('Sync contacts');
    expect(page.data[0].recurrence).toMatchObject({localTime: '09:00'});
    await client.schedules.create({action: 'sync_contacts', timezone: 'UTC', recurrence: {frequency: 'daily', interval: 1, localTime: '09:00', timezone: 'UTC'}});
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({action: 'sync_contacts', recurrence: {local_time: '09:00'}});
  });

  test('decodes the nested error contract with fields and request IDs', async () => {
    const fetcher = mock(() => Promise.resolve(Response.json({error: {code: 'validation_failed', message: 'Invalid', fields: {action: ['is unknown']}, request_id: 'req_1'}}, {status: 422})));
    const client = new Incld({apiKey: 'sk_test', fetch: fetcher});
    try { await client.schedules.get('bad'); throw new Error('expected failure'); }
    catch (error) { expect(error).toBeInstanceOf(ValidationError); expect((error as ValidationError).fields).toEqual({action: ['is unknown']}); expect((error as ValidationError).requestId).toBe('req_1'); }
  });

  test('distinguishes forbidden responses from authentication failures', async () => {
    const client = new Incld({apiKey: 'sk_test', fetch: mock(() => Promise.resolve(Response.json({error: {code: 'component_not_enabled', message: 'Not enabled'}}, {status: 403})))});
    expect(client.actions.list()).rejects.toThrow(ForbiddenError);
  });
});
