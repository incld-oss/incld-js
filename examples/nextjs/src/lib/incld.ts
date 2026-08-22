import 'server-only';
import {createIncld, defineActions} from '@incld/client/next';

function required(name: 'INCLD_SECRET_KEY' | 'INCLD_WEBHOOK_SECRET') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to run the INCLD integration.`);
  return value;
}

export const actions = defineActions({
  generate_report: {
    displayName: 'Generate executive report',
    description: 'Build and deliver a fresh account report.',
    payloadSchema: {type: 'object', properties: {accountId: {type: 'string'}}},
    run: async ({payload, event}) => {
      // Replace this with your application service. The event ID is the idempotency key.
      console.info('generate_report', {payload, eventId: event.idempotencyKey});
    },
  },
  sync_crm_contacts: {
    displayName: 'Sync CRM contacts',
    description: 'Synchronize a durable chunk of CRM contacts.',
    payloadSchema: {type: 'object', properties: {items: {type: 'array'}}},
    run: async ({payload, event}) => {
      console.info('sync_crm_contacts', {payload, eventId: event.idempotencyKey});
    },
  },
});

export const incld = createIncld({
  apiKey: required('INCLD_SECRET_KEY'),
  webhookSecret: required('INCLD_WEBHOOK_SECRET'),
  baseUrl: process.env.INCLD_API_URL,
  actions,
  resolveContext: async () => {
    // Replace this demo identity with your auth provider's server-side session lookup.
    const userId = process.env.INCLD_DEMO_USER_ID;
    return userId ? {user: {id: userId}, roles: ['member'], permissions: ['incld:use']} : null;
  },
  authorize: async ({context}) => {
    // Keep product authorization here, next to the trusted session context.
    return context.permissions?.includes('incld:use') === true;
  },
});
