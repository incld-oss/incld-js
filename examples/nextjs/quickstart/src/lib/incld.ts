import "server-only"
import { createIncld, defineActions } from "@incld/client/next"
import { auth } from "@/lib/auth"
import { reports } from "@/lib/reports"

const actions = defineActions({
 generate_report: {
  displayName: "Generate report",
  payloadSchema: {
   type: "object",
   properties: { accountId: { type: "string" } },
   required: ["accountId"],
  },
  async run({ payload, event }) {
   await reports.generate(payload.accountId, {
    idempotencyKey: event.idempotencyKey,
   })
  },
 },
})

export const incld = createIncld({
 apiKey: process.env.INCLD_SECRET_KEY!,
 webhookSecret: process.env.INCLD_WEBHOOK_SECRET!,
 baseUrl: process.env.INCLD_API_URL,
 actions,
 async resolveContext() {
  const session = await auth()
  if (!session?.user.id || !session.organizationId) return null
  return {
   user: { id: session.user.id },
   organization: { id: session.organizationId },
   roles: session.user.roles,
   permissions: session.user.permissions,
  }
 },
 async authorize({ context, operation }) {
  return context.permissions?.includes(`incld:${operation}`) === true
 },
})
