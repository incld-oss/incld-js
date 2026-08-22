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

function toWebRequest(event: any): Request {
  if (event.web?.request instanceof Request) return event.web.request;
  const req = event.node?.req || event.req;
  if (!req) throw new Error('Could not convert Nuxt event to a Web Request.');
  const protocol = req.socket?.encrypted ? 'https' : 'http';
  return new Request(`${protocol}://${req.headers?.host || 'localhost'}${req.url || '/'}`, {
    method: req.method,
    headers: req.headers as any,
    body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : req,
    duplex: 'half',
  } as any);
}

export function createIncld<Context extends IncldContext = IncldContext>(
  options: CreateIncldOptions<Context, any>,
) {
  const core = createCoreIntegration(options);
  const routes = (event: any) => core.routes(toWebRequest(event), event);
  const webhook = (event: any) => core.webhook(toWebRequest(event));
  const nuxt = {routes, webhook};
  return {...core, routes, webhook, nuxt};
}
