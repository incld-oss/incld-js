import { expect, test, describe, mock } from "bun:test";
import * as crypto from "crypto";
import { verifyWebhookSignature, createWebhookHandler } from "../src/webhook.js";

describe("Webhook", () => {
  const secret = "test-secret";
  const payload = JSON.stringify({ type: "schedule.created", data: { id: "123" } });

  describe("verifyWebhookSignature", () => {
    test("returns true for valid signature", async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signatureHash = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const signatureHeader = `t=${timestamp},v1=${signatureHash}`;

      expect(await verifyWebhookSignature(payload, signatureHeader, secret)).toBe(true);
    });

    test("returns false for invalid signature", async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = `t=${timestamp},v1=invalid_hash`;

      expect(await verifyWebhookSignature(payload, signatureHeader, secret)).toBe(false);
    });

    test("returns false for missing timestamp", async () => {
      const signatureHeader = `v1=hash`;
      expect(await verifyWebhookSignature(payload, signatureHeader, secret)).toBe(false);
    });

    test("returns false for expired timestamp", async () => {
      // 10 minutes ago
      const timestamp = Math.floor(Date.now() / 1000) - 600;
      const signedPayload = `${timestamp}.${payload}`;
      const signatureHash = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const signatureHeader = `t=${timestamp},v1=${signatureHash}`;

      // Default tolerance is 300 (5 mins), so this should fail
      expect(await verifyWebhookSignature(payload, signatureHeader, secret)).toBe(false);
    });
  });

  describe("createWebhookHandler", () => {
    test("returns 405 for non-POST method", async () => {
      const handler = createWebhookHandler({ secret, actions: {} });
      const req = new Request("http://localhost", { method: "GET" });
      const res = await handler(req);

      expect(res.status).toBe(405);
    });

    test("returns 401 for missing signature", async () => {
      const handler = createWebhookHandler({ secret, actions: {} });
      const req = new Request("http://localhost", { method: "POST" });
      const res = await handler(req);

      expect(res.status).toBe(401);
    });

    test("returns 401 for invalid signature", async () => {
      const handler = createWebhookHandler({ secret, actions: {} });
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "webhook-signature": "invalid" },
        body: payload
      });
      const res = await handler(req);

      expect(res.status).toBe(401);
    });

    test("calls action handler on successful verification", async () => {
      const actionMock = mock(() => Promise.resolve());
      const handler = createWebhookHandler({
        secret,
        actions: { "schedule.created": actionMock }
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signatureHash = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");
      const signatureHeader = `t=${timestamp},v1=${signatureHash}`;

      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "incld-signature": signatureHeader },
        body: payload
      });

      const res = await handler(req);

      expect(res.status).toBe(200);
      expect(actionMock).toHaveBeenCalled();
      const eventArg = actionMock.mock.calls[0][0];
      expect(eventArg.type).toBe("schedule.created");
      expect(eventArg.data.id).toBe("123");
    });
  });
});
