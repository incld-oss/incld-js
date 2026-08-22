import type {RequestClient} from '../client.js';
import type {Action, DefineActionInput, Page, PageParams, RequestOptions} from '../types.js';
import {pageFromWire, type PageWire} from './shared.js';

interface ActionWire {
  id: string; identifier: string; display_name: string; description?: string;
  payload_schema?: Record<string, unknown>; configuration?: Record<string, unknown>;
  inserted_at: string; updated_at: string;
}

const fromWire = (action: ActionWire): Action => ({
  id: action.id,
  identifier: action.identifier,
  displayName: action.display_name,
  description: action.description,
  payloadSchema: action.payload_schema ?? {},
  configuration: action.configuration ?? {},
  createdAt: action.inserted_at,
  updatedAt: action.updated_at,
});

export class ActionsResource {
  constructor(private client: RequestClient) {}

  async define(input: DefineActionInput, options?: RequestOptions): Promise<Action> {
    const response = await this.client._request<{data: ActionWire}>('POST', '/actions', {
      identifier: input.identifier,
      display_name: input.displayName,
      description: input.description,
      payload_schema: input.payloadSchema,
      configuration: input.configuration,
    }, undefined, options);
    return fromWire(response.data);
  }

  async list(params?: PageParams, options?: RequestOptions): Promise<Page<Action>> {
    const response = await this.client._request<PageWire<ActionWire>>(
      'GET', '/actions', undefined, params, options,
    );
    return pageFromWire(response, fromWire);
  }

  async get(identifier: string, options?: RequestOptions): Promise<Action> {
    const response = await this.client._request<{data: ActionWire}>(
      'GET', `/actions/${encodeURIComponent(identifier)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }
}
