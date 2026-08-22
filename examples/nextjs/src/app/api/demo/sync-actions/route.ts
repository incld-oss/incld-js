import {incld} from '@/lib/incld';

export async function POST() {
  try {
    await incld.syncActions();
    return Response.json({data: {synced: true}});
  } catch (error) {
    return Response.json(
      {error: {message: error instanceof Error ? error.message : 'Could not sync demo actions.'}},
      {status: 502},
    );
  }
}
