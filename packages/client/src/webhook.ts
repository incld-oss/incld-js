
import { WebhookEvent, WebhookOptions } from './types.js';

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes by default
): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestampStr = timestampPart.split('=')[1];
    const providedSignature = signaturePart.split('=')[1];

    if (!timestampStr || !providedSignature) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return false;
    }

    // Check tolerance
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > tolerance) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;

    // dynamically import crypto
    const crypto = await import('crypto');

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    return false;
  }
}

export function createWebhookHandler(options: WebhookOptions): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('incld-signature') || request.headers.get('webhook-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    let rawBody: string;
    try {
      rawBody = await request.clone().text();
    } catch (e) {
      return new Response('Error reading body', { status: 400 });
    }

    const isValid = await verifyWebhookSignature(rawBody, signature, options.secret);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch (e) {
      return new Response('Invalid JSON payload', { status: 400 });
    }

    const action = options.actions[event.type];
    if (action) {
      try {
        await action(event);
      } catch (error) {
        console.error(`Error handling webhook action for event ${event.type}:`, error);
        return new Response('Internal Server Error processing action', { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}
