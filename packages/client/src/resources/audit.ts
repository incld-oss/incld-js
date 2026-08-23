import type {RequestClient} from '../client.js';
import type {Page, PageParams, RequestOptions} from '../types.js';
import {pageFromWire, type PageWire} from './shared.js';

export type AuditVisibility = 'project' | 'participants' | 'restricted';
export type AuditSource = 'system' | 'manual';
export interface AuditEvent {
  id: string; component: string; type: string; actorId?: string; externalOrganizationId?: string; subjectType?: string;
  subjectId?: string; source: AuditSource; visibility: AuditVisibility;
  data: Record<string, unknown>; occurredAt: string; createdAt: string;
}
export interface AuditEventWire {
  id: string; component: string; type: string; actor_id?: string; external_organization_id?: string; subject_type?: string;
  subject_id?: string; source: AuditSource; visibility: AuditVisibility;
  data?: Record<string, unknown>; occurred_at: string; inserted_at: string;
}
export interface ListAuditEventsParams extends PageParams {
  externalOrganizationId?: string;
  component?: string; components?: string[]; type?: string; typePrefix?: string;
  actorId?: string; subjectType?: string; subjectId?: string; viewerId?: string; since?: string; until?: string;
}
export interface CreateAuditEventInput {
  externalOrganizationId?: string;
  type: string; actorId?: string; subjectType?: string; subjectId?: string;
  visibility?: AuditVisibility; participantIds?: string[]; allowedViewerIds?: string[];
  data?: Record<string, unknown>; occurredAt?: string;
}

export const auditEventFromWire = (event: AuditEventWire): AuditEvent => ({
  id: event.id,
  component: event.component,
  type: event.type,
  actorId: event.actor_id,
  externalOrganizationId: event.external_organization_id,
  subjectType: event.subject_type,
  subjectId: event.subject_id,
  source: event.source,
  visibility: event.visibility,
  data: event.data ?? {},
  occurredAt: event.occurred_at,
  createdAt: event.inserted_at,
});

export class AuditResource {
  constructor(private client: RequestClient) {}

  async list(params?: ListAuditEventsParams, options?: RequestOptions): Promise<Page<AuditEvent>> {
    const response = await this.client._request<PageWire<AuditEventWire>>('GET', '/audit-events', undefined, {
      component: params?.component,
      components: params?.components?.join(','),
      type: params?.type,
      type_prefix: params?.typePrefix,
      actor_id: params?.actorId,
      external_organization_id: params?.externalOrganizationId,
      subject_type: params?.subjectType,
      subject_id: params?.subjectId,
      viewer_id: params?.viewerId,
      since: params?.since,
      until: params?.until,
      limit: params?.limit,
      cursor: params?.cursor,
    }, options);
    return pageFromWire(response, auditEventFromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<AuditEvent> {
    const response = await this.client._request<{data: AuditEventWire}>(
      'GET', `/audit-events/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return auditEventFromWire(response.data);
  }

  async create(input: CreateAuditEventInput, options?: RequestOptions): Promise<AuditEvent> {
    const response = await this.client._request<{data: AuditEventWire}>('POST', '/audit-events', {
      type: input.type,
      actor_id: input.actorId,
      external_organization_id: input.externalOrganizationId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      visibility: input.visibility,
      participant_ids: input.participantIds,
      allowed_viewer_ids: input.allowedViewerIds,
      data: input.data,
      occurred_at: input.occurredAt,
    }, undefined, options);
    return auditEventFromWire(response.data);
  }
}

/** @deprecated Use CreateAuditEventInput. */
export type CreateAuditEventParams = CreateAuditEventInput;
