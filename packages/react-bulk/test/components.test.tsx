import {expect, test} from 'bun:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncldBrowser, type BulkOperation} from '@incld/client';
import {IncldProvider} from '@incld/react';
import {BulkProgress} from '../src/index.js';

test('bulk progress supports supplied data, custom classes, and safe progress bounds', () => {
  const client = new IncldBrowser({fetch: async () => Response.json({data: {}})});
  const operation: BulkOperation = {
    id: 'bulk_1',
    projectId: 'project_1',
    action: 'sync_contacts',
    status: 'running',
    metadata: {},
    chunkSize: 10,
    progress: {
      totalItems: 30,
      totalChunks: 3,
      completedChunks: 3,
      succeededChunks: 3,
      failedChunks: 0,
      percentage: 140,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const html = renderToStaticMarkup(
    <IncldProvider client={client}>
      <BulkProgress operation={operation} className="embedded-progress" />
    </IncldProvider>,
  );

  expect(html).toContain('incld-bulk-progress embedded-progress');
  expect(html).toContain('aria-label="sync_contacts progress"');
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain('width:100%');
});
