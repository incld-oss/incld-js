import {describe, expect, test} from 'bun:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncldBrowser, ValidationError} from '@incld/client';
import {IncldFieldError, IncldProvider, IncldSpinner} from '../src/index.js';

describe('shared React appearance contract', () => {
  const client = new IncldBrowser({fetch: async () => Response.json({data: {}})});

  test('maps typed theme variables and root overrides to CSS custom properties', () => {
    const html = renderToStaticMarkup(
      <IncldProvider
        client={client}
        className="product-components"
        appearance={{
          colorScheme: 'dark',
          density: 'compact',
          variables: {
            accent: '#7c3aed',
            accentContrast: '#ffffff',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      >
        <span>Configured</span>
      </IncldProvider>,
    );

    expect(html).toContain('class="incld-root product-components"');
    expect(html).toContain('data-color-scheme="dark"');
    expect(html).toContain('data-density="compact"');
    expect(html).toContain('--incld-accent:#7c3aed');
    expect(html).toContain('--incld-accent-contrast:#ffffff');
    expect(html).toContain('--incld-font-family:Inter, sans-serif');
  });

  test('uses provider labels and renders API field errors accessibly', () => {
    const error = new ValidationError('Invalid policy', 422, 'validation_failed', {
      resource_pattern: ['already has a policy in this project'],
    });
    const html = renderToStaticMarkup(
      <IncldProvider client={client} labels={{loading: 'Fetching records'}}>
        <IncldSpinner />
        <IncldFieldError error={error} fields="resource_pattern" id="resource-error" />
      </IncldProvider>,
    );

    expect(html).toContain('Fetching records');
    expect(html).toContain('id="resource-error"');
    expect(html).toContain('already has a policy in this project');
    expect(html).toContain('role="alert"');
  });

  test('advertises the automatic refresh interval and supports disabling it', () => {
    const defaultHtml = renderToStaticMarkup(
      <IncldProvider client={client}><span>Default sync</span></IncldProvider>,
    );
    const clampedHtml = renderToStaticMarkup(
      <IncldProvider client={client} refreshInterval={100}><span>Fast sync</span></IncldProvider>,
    );
    const disabledHtml = renderToStaticMarkup(
      <IncldProvider client={client} refreshInterval={false}><span>Manual sync</span></IncldProvider>,
    );

    expect(defaultHtml).toContain('data-refresh-interval="5000"');
    expect(clampedHtml).toContain('data-refresh-interval="1000"');
    expect(disabledHtml).toContain('data-refresh-interval="off"');
  });
});
