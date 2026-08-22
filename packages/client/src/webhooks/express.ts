import {createCoreIntegration, type CreateIncldOptions, type IncldContext} from '../handler.js';

export {composeContext, defineAction, defineActions} from '../handler.js';
export type {
  CreateIncldOptions,
  IncldActionDefinition,
  IncldActionEvent,
  IncldActionHandler,
  IncldActionInput,
  IncldAuthorizationInput,
  IncldContext,
} from '../handler.js';

function toWebRequest(req: any): Request {
  const protocol = req.protocol || (req.socket?.encrypted ? 'https' : 'http');
  const host = req.get?.('host') || req.headers?.host || 'localhost';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(value)) value.forEach(item => headers.append(key, String(item)));
    else if (value != null) headers.set(key, String(value));
  }
  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) body = req.body;
    else if (typeof req.body === 'string') body = req.body;
    else if (req.body != null) body = JSON.stringify(req.body);
  }
  return new Request(`${protocol}://${host}${req.originalUrl || req.url}`, {
    method: req.method,
    headers,
    body,
  });
}

function middleware(handler: (request: Request, native?: any) => Promise<Response>) {
  return async (req: any, res: any, next?: (error?: unknown) => void) => {
    try {
      const response = await handler(toWebRequest(req), req);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.status(response.status).send(await response.text());
    } catch (error) {
      if (next) return next(error);
      res.status(500).send('Internal Server Error');
    }
  };
}

export function createIncld<Context extends IncldContext = IncldContext>(
  options: CreateIncldOptions<Context, any>,
) {
  const core = createCoreIntegration(options);
  const routes = middleware(core.routes);
  const webhook = middleware(request => core.webhook(request));
  const express = {routes, webhook};
  return {...core, routes, webhook, express};
}
