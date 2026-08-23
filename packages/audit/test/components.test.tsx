import {expect, test} from 'bun:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncldBrowser} from '@incld/client';
import {IncldProvider} from '@incld/react';
import {AuditEventDetails} from '../src/index.js';

test('audit details prioritize the event context people need', () => {
  const client = new IncldBrowser({fetch: async () => Response.json({data: {}})});
  const html = renderToStaticMarkup(<IncldProvider client={client}><AuditEventDetails event={{id:'evt_1',component:'approvals',type:'approval.approved',actorId:'reviewer_1',subjectType:'invoice',subjectId:'inv_1',source:'system',visibility:'project',data:{decision:'approved'},occurredAt:'2026-01-01T00:00:00Z',createdAt:'2026-01-01T00:00:00Z'}} /></IncldProvider>);
  expect(html).toContain('approved');
  expect(html).toContain('reviewer_1');
  expect(html).toContain('inv_1');
  expect(html).not.toContain('Event data');
  expect(html).not.toContain('Visibility');
  expect(html).not.toContain('Source');
});
