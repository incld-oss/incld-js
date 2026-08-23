import {describe, expect, test} from 'bun:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncldBrowser} from '@incld/client';
import {IncldProvider} from '@incld/react';
import {ApprovalPolicyEditor, ApprovalTimeline} from '../src/index.js';

test('approval timeline communicates state with text, not color alone', () => {
  const html = renderToStaticMarkup(<ApprovalTimeline approval={{id:'apr_1',projectId:'prj_1',resourceType:'invoice',resourceId:'inv_1',action:'pay',status:'approved',metadata:{},revision:1,policySnapshot:{},decisions:[{id:'dec_1',decision:'approved',actorId:'reviewer_1',createdAt:'2026-01-01T00:00:00Z'}],events:[],createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'}} />);
  expect(html).toContain('approved');
  expect(html).not.toContain('approval approved');
  expect(html).toContain('reviewer_1');
  expect(html).toContain('<ol');
});

describe('approval policy editor', () => {
  const client = new IncldBrowser({fetch: async () => Response.json({data: {}})});

  test('requires an explicit unique resource scope instead of defaulting to the wildcard policy', () => {
    const html = renderToStaticMarkup(
      <IncldProvider client={client}>
        <ApprovalPolicyEditor className="policy-surface" />
      </IncldProvider>,
    );

    expect(html).toContain('incld-policy-editor policy-surface');
    expect(html).toContain('placeholder="release:*"');
    expect(html).toContain('value=""');
    expect(html).toContain('the wildcard * can only exist once');
    expect(html).toContain('Create policy');
  });
});
