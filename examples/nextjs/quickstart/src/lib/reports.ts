export const reports = {
  async generate(accountId: string, options: {idempotencyKey: string}) {
    // Replace this fixture with a durable application operation.
    console.info('generate report', {accountId, ...options});
  },
};
