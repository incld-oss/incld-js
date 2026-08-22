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

type RequestEventLike = {request: Request};

export function createIncld<
  Context extends IncldContext = IncldContext,
  Event extends RequestEventLike = RequestEventLike,
>(options: CreateIncldOptions<Context, Event>) {
  const core = createCoreIntegration(options);
  const route = (event: Event) => core.routes(event.request, event);
  const routes = {GET: route, POST: route, PATCH: route, DELETE: route};
  const webhook = (event: Event) => core.webhook(event.request);
  const sveltekit = {routes, webhook};
  return {...core, routes, webhook, sveltekit};
}
