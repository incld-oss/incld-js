import {incldForOrganization} from '@/lib/incld';

export async function POST() {
  const externalOrganizationId = process.env.INCLD_DEMO_ORGANIZATION_ID;
  if (!externalOrganizationId) {
    return Response.json({error: 'Demo organization is not configured.'}, {status: 503});
  }

  const operation = await incldForOrganization(externalOrganizationId).bulkOperations.create({
    action: 'sync_crm_contacts',
    items: Array.from({length: 24}, (_, index) => ({id: `contact_${index + 1}`, email: `contact-${index + 1}@example.com`})),
    chunkSize: 4,
    metadata: {source: 'nextjs-reference'},
  }, {idempotencyKey: crypto.randomUUID()});
  return Response.json({data: operation}, {status: 201});
}
