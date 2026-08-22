import {incld} from '@/lib/incld';

export async function POST() {
  const operation = await incld.client.bulkOperations.create({
    action: 'sync_crm_contacts',
    items: Array.from({length: 24}, (_, index) => ({id: `contact_${index + 1}`, email: `contact-${index + 1}@example.com`})),
    chunkSize: 4,
    metadata: {source: 'nextjs-reference'},
  }, {idempotencyKey: crypto.randomUUID()});
  return Response.json({data: operation}, {status: 201});
}
