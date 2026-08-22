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

export function createIncld<Context extends IncldContext = IncldContext>(
  options: CreateIncldOptions<Context, Request>,
) {
  const core = createCoreIntegration(options);
  const route = (request: Request) => core.routes(request, request);
  const routes = {GET: route, POST: route, PATCH: route, DELETE: route};
  const next = {routes, webhook: core.webhook};
  return {...core, routes, next};
}
