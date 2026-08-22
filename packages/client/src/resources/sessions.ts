import type {RequestClient} from '../client.js';
import type {CreateSessionInput, RequestOptions, SessionToken} from '../types.js';

export class SessionsResource {
  constructor(private client: RequestClient) {}

  async create(input: CreateSessionInput, options?: RequestOptions): Promise<SessionToken> {
    const response = await this.client._request<{data: SessionToken}>(
      'POST', '/sessions', input, undefined, options,
    );
    return response.data;
  }
}
