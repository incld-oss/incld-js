import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {resolveProxyOperation} from '../src/handler.js';

const expected = new Map<string, string>([
  ['GET /actions', 'actions.read'],
  ['GET /actions/{identifier}', 'actions.read'],
  ['POST /schedules/preview', 'schedules.preview'],
  ['GET /schedules', 'schedules.read'],
  ['POST /schedules', 'schedules.create'],
  ['GET /schedules/{id}', 'schedules.read'],
  ['PATCH /schedules/{id}', 'schedules.update'],
  ['DELETE /schedules/{id}', 'schedules.delete'],
  ['POST /schedules/{id}/pause', 'schedules.control'],
  ['POST /schedules/{id}/resume', 'schedules.control'],
  ['GET /schedules/{id}/runs', 'schedules.history'],
  ['GET /schedules/{id}/events', 'schedules.history'],
  ['GET /runs', 'runs.read'],
  ['GET /runs/{id}', 'runs.read'],
  ['POST /approvals/check', 'approvals.check'],
  ['GET /approvals', 'approvals.read'],
  ['POST /approvals', 'approvals.create'],
  ['GET /approvals/{id}', 'approvals.read'],
  ['PATCH /approvals/{id}', 'approvals.update'],
  ['DELETE /approvals/{id}', 'approvals.delete'],
  ['POST /approvals/{id}/decisions', 'approvals.decide'],
  ['POST /approvals/{id}/cancel', 'approvals.decide'],
  ['POST /approvals/{id}/revoke', 'approvals.decide'],
  ['GET /approvals/{id}/events', 'approvals.history'],
  ['GET /approval-policies', 'approval_policies.read'],
  ['GET /approval-policies/{id}', 'approval_policies.read'],
  ['POST /approval-policies', 'approval_policies.create'],
  ['PATCH /approval-policies/{id}', 'approval_policies.update'],
  ['DELETE /approval-policies/{id}', 'approval_policies.delete'],
  ['GET /audit-events', 'audit.read'],
  ['POST /audit-events', 'audit.create'],
  ['GET /audit-events/{id}', 'audit.read'],
  ['GET /bulk-operations', 'bulk.read'],
  ['GET /bulk-operations/{id}', 'bulk.read'],
  ['GET /bulk-operations/{id}/chunks', 'bulk.read'],
  ['GET /bulk-operations/{id}/events', 'bulk.read'],
  ['POST /bulk-operations/{id}/cancel', 'bulk.cancel'],
  ['POST /sessions', 'sessions.create'],
]);

const serverOnly = new Set([
  'POST /actions',
  'POST /bulk-operations',
]);

function openApiOperations() {
  const source = readFileSync(resolve(import.meta.dir, '../../../openapi.yaml'), 'utf8');
  const result: string[] = [];
  let path: string | undefined;

  for (const line of source.split('\n')) {
    const pathMatch = /^  (\/[^:]+):\s*$/.exec(line);
    if (pathMatch) {
      path = pathMatch[1];
      continue;
    }
    const methodMatch = /^    (get|post|put|patch|delete):\s*$/.exec(line);
    if (path && methodMatch) result.push(`${methodMatch[1].toUpperCase()} ${path}`);
  }
  return result;
}

function concretePath(path: string) {
  return path.replaceAll(/\{[^}]+\}/g, 'sample-id');
}

describe('browser proxy and OpenAPI contract', () => {
  test('covers every public operation except documented server-only writes', () => {
    const documented = openApiOperations();
    expect(documented).toHaveLength(40);
    expect(new Set([...expected.keys(), ...serverOnly])).toEqual(new Set(documented));

    for (const operation of documented) {
      const separator = operation.indexOf(' ');
      const method = operation.slice(0, separator);
      const path = operation.slice(separator + 1);
      const resolved = resolveProxyOperation(method, concretePath(path));

      if (serverOnly.has(operation)) {
        expect(resolved, operation).toBeUndefined();
      } else {
        expect(resolved?.operation, operation).toBe(expected.get(operation));
      }
    }
  });

  test('does not admit nearby unversioned or invented operations', () => {
    expect(resolveProxyOperation('POST', '/actions')).toBeUndefined();
    expect(resolveProxyOperation('POST', '/bulk-operations')).toBeUndefined();
    expect(resolveProxyOperation('PUT', '/schedules/sample-id')).toBeUndefined();
    expect(resolveProxyOperation('GET', '/projects')).toBeUndefined();
  });
});
