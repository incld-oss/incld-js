import type {RequestClient} from '../client.js';
import type {Page, PageParams, RequestOptions} from '../types.js';
import {pageFromWire, type PageWire} from './shared.js';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'revoked';
export type ApprovalDecisionValue = 'approved' | 'rejected';
export type ApprovalPolicyMode = 'any' | 'all' | 'quorum';

export interface ApprovalDecisionRecord {
  id: string; decision: 'approved' | 'rejected' | 'revoked'; actorId: string;
  reason?: string; createdAt: string;
}
export interface ApprovalEvent {
  id: string; type: string; actorId?: string; data: Record<string, unknown>; createdAt: string;
}
export interface ApprovalPolicySnapshot {
  id?: string; revision?: number; resourcePattern?: string; allowedApprovers?: string[];
  mode?: ApprovalPolicyMode; requiredApprovals?: number; allowSelfApproval?: boolean;
}
export interface ApprovalPolicy {
  id: string; projectId: string; resourcePattern: string; allowedApprovers: string[];
  mode: ApprovalPolicyMode; requiredApprovals: number; allowSelfApproval: boolean;
  revision: number; createdAt: string; updatedAt: string;
}
export interface Approval {
  id: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  requesterId?: string;
  approverId?: string;
  status: ApprovalStatus;
  title?: string;
  description?: string;
  metadata: Record<string, unknown>;
  revision: number;
  policyId?: string;
  policySnapshot: ApprovalPolicySnapshot;
  expiresAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;
  revokedAt?: string;
  decisions: ApprovalDecisionRecord[];
  events: ApprovalEvent[];
  createdAt: string;
  updatedAt: string;
}

interface ApprovalWire {
  id: string; project_id: string; resource_type: string; resource_id: string; action: string;
  requester_id?: string; approver_id?: string; status: ApprovalStatus; title?: string;
  description?: string; metadata?: Record<string, unknown>; revision?: number; policy_id?: string;
  policy_snapshot?: Record<string, any>; expires_at?: string; resolved_at?: string;
  cancelled_at?: string; revoked_at?: string;
  decisions?: Array<{id: string; decision: 'approved' | 'rejected' | 'revoked'; actor_id: string; reason?: string; inserted_at: string}>;
  events?: Array<{id: string; type: string; actor_id?: string; data?: Record<string, unknown>; inserted_at: string}>;
  inserted_at: string; updated_at: string;
}
interface PolicyWire {
  id: string; project_id: string; resource_pattern: string; allowed_approvers: string[];
  mode: ApprovalPolicyMode; required_approvals: number; allow_self_approval: boolean;
  revision: number; inserted_at: string; updated_at: string;
}

export interface ApprovalRequestInput {
  policy?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  requesterId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}
export interface UpdateApprovalInput {
  title?: string; description?: string; metadata?: Record<string, unknown>; expiresAt?: string;
}
export interface ApprovalCheckInput {
  resourceType: string; resourceId: string; action: string; requesterId?: string;
}
export interface ApprovalCheck {
  approved: boolean; status: ApprovalStatus | 'none'; approvalId?: string;
}
export interface ListApprovalsParams extends PageParams {
  resourceId?: string; requesterId?: string; approverId?: string; status?: ApprovalStatus;
  view?: 'assigned' | 'requested' | 'all';
}
export interface CreateApprovalPolicyInput {
  resourcePattern: string; allowedApprovers: string[]; mode?: ApprovalPolicyMode;
  requiredApprovals?: number; allowSelfApproval?: boolean;
}

const snapshotFromWire = (value: Record<string, any> = {}): ApprovalPolicySnapshot => ({
  id: value.id,
  revision: value.revision,
  resourcePattern: value.resource_pattern,
  allowedApprovers: value.allowed_approvers,
  mode: value.mode,
  requiredApprovals: value.required_approvals,
  allowSelfApproval: value.allow_self_approval,
});

const eventFromWire = (event: NonNullable<ApprovalWire['events']>[number]): ApprovalEvent => ({
  id: event.id,
  type: event.type,
  actorId: event.actor_id,
  data: event.data ?? {},
  createdAt: event.inserted_at,
});

const fromWire = (approval: ApprovalWire): Approval => ({
  id: approval.id,
  projectId: approval.project_id,
  resourceType: approval.resource_type,
  resourceId: approval.resource_id,
  action: approval.action,
  requesterId: approval.requester_id,
  approverId: approval.approver_id,
  status: approval.status,
  title: approval.title,
  description: approval.description,
  metadata: approval.metadata ?? {},
  revision: approval.revision ?? 1,
  policyId: approval.policy_id,
  policySnapshot: snapshotFromWire(approval.policy_snapshot),
  expiresAt: approval.expires_at,
  resolvedAt: approval.resolved_at,
  cancelledAt: approval.cancelled_at,
  revokedAt: approval.revoked_at,
  decisions: (approval.decisions ?? []).map(decision => ({
    id: decision.id,
    decision: decision.decision,
    actorId: decision.actor_id,
    reason: decision.reason,
    createdAt: decision.inserted_at,
  })),
  events: (approval.events ?? []).map(eventFromWire),
  createdAt: approval.inserted_at,
  updatedAt: approval.updated_at,
});

const policyFromWire = (policy: PolicyWire): ApprovalPolicy => ({
  id: policy.id,
  projectId: policy.project_id,
  resourcePattern: policy.resource_pattern,
  allowedApprovers: policy.allowed_approvers,
  mode: policy.mode,
  requiredApprovals: policy.required_approvals,
  allowSelfApproval: policy.allow_self_approval,
  revision: policy.revision,
  createdAt: policy.inserted_at,
  updatedAt: policy.updated_at,
});

export class ApprovalsResource {
  constructor(private client: RequestClient) {}

  async list(params?: ListApprovalsParams, options?: RequestOptions): Promise<Page<Approval>> {
    const response = await this.client._request<PageWire<ApprovalWire>>('GET', '/approvals', undefined, {
      resource_id: params?.resourceId,
      requester_id: params?.requesterId,
      approver_id: params?.approverId,
      status: params?.status,
      view: params?.view,
      limit: params?.limit,
      cursor: params?.cursor,
    }, options);
    return pageFromWire(response, fromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>(
      'GET', `/approvals/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }

  async check(input: ApprovalCheckInput, options?: RequestOptions): Promise<ApprovalCheck> {
    const response = await this.client._request<{data: {approved: boolean; status: ApprovalCheck['status']; approval_id?: string}}>(
      'POST', '/approvals/check', {
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        action: input.action,
        requester_id: input.requesterId,
      }, undefined, options,
    );
    return {approved: response.data.approved, status: response.data.status, approvalId: response.data.approval_id};
  }

  async create(input: ApprovalRequestInput, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>('POST', '/approvals', {
      policy_id: input.policy,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      action: input.action,
      requester_id: input.requesterId,
      title: input.title,
      description: input.description,
      metadata: input.metadata,
      expires_at: input.expiresAt,
    }, undefined, options);
    return fromWire(response.data);
  }

  async update(id: string, input: UpdateApprovalInput, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>('PATCH', `/approvals/${encodeURIComponent(id)}`, {
      title: input.title,
      description: input.description,
      metadata: input.metadata,
      expires_at: input.expiresAt,
    }, undefined, options);
    return fromWire(response.data);
  }

  async decide(
    id: string,
    input: {decision: ApprovalDecisionValue; reason?: string; approverId?: string},
    options?: RequestOptions,
  ): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>(
      'POST', `/approvals/${encodeURIComponent(id)}/decisions`, {
        decision: input.decision,
        reason: input.reason,
        approver_id: input.approverId,
      }, undefined, options,
    );
    return fromWire(response.data);
  }

  approve(id: string, reason?: string, options?: RequestOptions) {
    return this.decide(id, {decision: 'approved', reason}, options);
  }
  reject(id: string, reason?: string, options?: RequestOptions) {
    return this.decide(id, {decision: 'rejected', reason}, options);
  }

  async cancel(id: string, reason?: string, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>(
      'POST', `/approvals/${encodeURIComponent(id)}/cancel`, {reason}, undefined, options,
    );
    return fromWire(response.data);
  }

  async revoke(id: string, reason?: string, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>(
      'POST', `/approvals/${encodeURIComponent(id)}/revoke`, {reason}, undefined, options,
    );
    return fromWire(response.data);
  }

  async events(id: string, params?: PageParams, options?: RequestOptions): Promise<Page<ApprovalEvent>> {
    const response = await this.client._request<PageWire<NonNullable<ApprovalWire['events']>[number]>>(
      'GET', `/approvals/${encodeURIComponent(id)}/events`, undefined, params, options,
    );
    return pageFromWire(response, eventFromWire);
  }

  async remove(id: string, options?: RequestOptions): Promise<Approval> {
    const response = await this.client._request<{data: ApprovalWire}>(
      'DELETE', `/approvals/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return fromWire(response.data);
  }
}

export class ApprovalPoliciesResource {
  constructor(private client: RequestClient) {}

  async list(params?: PageParams, options?: RequestOptions): Promise<Page<ApprovalPolicy>> {
    const response = await this.client._request<PageWire<PolicyWire>>(
      'GET', '/approval-policies', undefined, params, options,
    );
    return pageFromWire(response, policyFromWire);
  }

  async get(id: string, options?: RequestOptions): Promise<ApprovalPolicy> {
    const response = await this.client._request<{data: PolicyWire}>(
      'GET', `/approval-policies/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return policyFromWire(response.data);
  }

  async create(input: CreateApprovalPolicyInput, options?: RequestOptions): Promise<ApprovalPolicy> {
    const response = await this.client._request<{data: PolicyWire}>(
      'POST', '/approval-policies', this.toWire(input), undefined, options,
    );
    return policyFromWire(response.data);
  }

  async update(id: string, input: Partial<CreateApprovalPolicyInput>, options?: RequestOptions): Promise<ApprovalPolicy> {
    const response = await this.client._request<{data: PolicyWire}>(
      'PATCH', `/approval-policies/${encodeURIComponent(id)}`, this.toWire(input), undefined, options,
    );
    return policyFromWire(response.data);
  }

  async remove(id: string, options?: RequestOptions): Promise<ApprovalPolicy> {
    const response = await this.client._request<{data: PolicyWire}>(
      'DELETE', `/approval-policies/${encodeURIComponent(id)}`, undefined, undefined, options,
    );
    return policyFromWire(response.data);
  }

  private toWire(input: Partial<CreateApprovalPolicyInput>) {
    return {
      resource_pattern: input.resourcePattern,
      allowed_approvers: input.allowedApprovers,
      mode: input.mode,
      required_approvals: input.requiredApprovals,
      allow_self_approval: input.allowSelfApproval,
    };
  }
}
