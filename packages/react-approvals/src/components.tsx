import React, {useEffect, useId, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode} from 'react';
import type {Approval, ApprovalCheckInput, ApprovalPolicy, ApprovalPolicyMode, ApprovalRequestInput, ListApprovalsParams} from '@incld/client';
import {errorMessagesFor, IncldButton, IncldDialog, IncldEmptyState, IncldErrorState, IncldFieldError, IncldSpinner, type AsyncViewProps} from '@incld/react';
import {useApproval, useApprovalCheck, useApprovalMutation, useApprovalPolicies, useApprovalPolicyMutation, useApprovals} from './hooks.js';

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)) : '—';
const eventLabel = (type: string) => type.replace(/^approval\./, '').replaceAll('_', ' ').replace('created', 'requested');

export interface ApprovalRequestDialogProps extends ApprovalRequestInput {
  open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (approval: Approval) => void; className?: string;
}
export function ApprovalRequestDialog({open, onOpenChange, onCreated, className = '', ...input}: ApprovalRequestDialogProps) {
  const mutation = useApprovalMutation(); const [note, setNote] = useState(input.description ?? '');
  const submit = async (event: FormEvent) => { event.preventDefault(); try { const approval = await mutation.create({...input, description: note}); onCreated?.(approval); onOpenChange(false); } catch { /* The mutation hook owns inline and provider-level error feedback. */ } };
  return <IncldDialog open={open} onOpenChange={onOpenChange} className={className} title="Request approval"><form className="incld-approval-request" onSubmit={submit}><div className="incld-resource-summary"><strong>{input.title ?? input.resourceId}</strong></div><label className="incld-field"><span>Note <small>Optional</small></span><textarea className="incld-input incld-textarea" value={note} onChange={event => setNote(event.target.value)} placeholder="Add context for reviewers" /></label>{mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}<div className="incld-form-actions"><button type="button" className="incld-button incld-button-secondary" onClick={() => onOpenChange(false)}>Cancel</button><IncldButton type="submit" busy={mutation.pending}>Send request</IncldButton></div></form></IncldDialog>;
}

export interface ApprovalRequestTriggerProps extends ApprovalRequestInput, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'action' | 'onError'> { onCreated?: (approval: Approval) => void }
export function ApprovalRequestTrigger({onCreated, children = 'Request approval', ...props}: ApprovalRequestTriggerProps) {
  const [open, setOpen] = useState(false); const {resourceType, resourceId, action, policy, title, description, metadata, expiresAt, ...button} = props;
  return <><IncldButton {...button} type="button" onClick={event => {button.onClick?.(event); setOpen(true);}}>{children}</IncldButton><ApprovalRequestDialog open={open} onOpenChange={setOpen} onCreated={onCreated} resourceType={resourceType} resourceId={resourceId} action={action} policy={policy} title={title} description={description} metadata={metadata} expiresAt={expiresAt} /></>;
}

export interface ApprovalInboxProps extends AsyncViewProps { view?: 'assigned' | 'requested' | 'all'; filters?: ListApprovalsParams; pageSize?: number; renderItem?: (approval: Approval) => ReactNode; onSelect?: (approval: Approval) => void; className?: string }
export function ApprovalInbox({view = 'assigned', filters = {}, pageSize = 25, renderItem, onSelect, className = '', loading, empty, error}: ApprovalInboxProps) {
  const state = useApprovals({...filters, view, limit: pageSize});
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading approvals" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="You're all caught up" description={view === 'assigned' ? 'No approvals are waiting for your decision.' : 'No approval requests match this view.'} />}</>;
  return <div className={`incld-approval-list ${className}`.trim()} role="list">{state.data.data.map(approval => <article key={approval.id} role="listitem" className="incld-approval-row">{renderItem ? renderItem(approval) : <button type="button" onClick={() => onSelect?.(approval)}><span><strong>{approval.title ?? approval.resourceId}</strong><small>{approval.description || `Requested ${formatDate(approval.createdAt)}`}</small></span><span className="incld-approval-row-meta"><span className={`incld-badge incld-badge-${approval.status}`}>{approval.status}</span></span></button>}</article>)}</div>;
}

export interface ApprovalActionsProps { approvalId: string; visible?: Array<'approve' | 'reject' | 'cancel' | 'revoke'>; onResolved?: (approval: Approval) => void; className?: string }
export function ApprovalActions({approvalId, visible = ['approve', 'reject'], onResolved, className = ''}: ApprovalActionsProps) {
  const mutation = useApprovalMutation(); const [mode, setMode] = useState<'approve' | 'reject' | 'cancel' | 'revoke'>(); const [reason, setReason] = useState('');
  const decide = async () => { if (!mode) return; const operation = {approve: mutation.approve, reject: mutation.reject, cancel: mutation.cancel, revoke: mutation.revoke}[mode]; try { const approval = await operation(approvalId, reason || undefined); onResolved?.(approval); setReason(''); setMode(undefined); } catch { /* Keep the decision form open so the user can retry. */ } };
  const reasonLabel = mode === 'approve' ? 'Approval note' : mode === 'reject' ? 'Reason for rejection' : `Reason to ${mode}`;
  return <section className={`incld-approval-actions ${className}`.trim()} aria-label="Approval actions">{mode ? <div className="incld-decision-form"><label className="incld-field"><span>{reasonLabel}</span><textarea className="incld-input incld-textarea" autoFocus value={reason} onChange={event => setReason(event.target.value)} required={mode !== 'approve'} /></label>{mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}<div className="incld-form-actions"><button type="button" className="incld-button incld-button-secondary" onClick={() => setMode(undefined)}>Back</button><IncldButton type="button" className={mode === 'approve' ? '' : 'incld-button-danger'} busy={mutation.pending} onClick={decide}>Confirm {mode}</IncldButton></div></div> : <div className="incld-action-buttons">{visible.includes('cancel') && <button type="button" className="incld-button incld-button-secondary" onClick={() => setMode('cancel')}>Cancel request</button>}{visible.includes('revoke') && <button type="button" className="incld-button incld-button-secondary" onClick={() => setMode('revoke')}>Revoke</button>}{visible.includes('reject') && <button type="button" className="incld-button incld-button-secondary" onClick={() => setMode('reject')}>Reject</button>}{visible.includes('approve') && <IncldButton type="button" onClick={() => setMode('approve')}>Approve</IncldButton>}</div>}</section>;
}

export interface ApprovalTimelineProps { approval: Approval; className?: string }
export function ApprovalTimeline({approval, className = ''}: ApprovalTimelineProps) {
  const items = [...approval.events.map(event => ({id: event.id, type: event.type, actor: event.actorId, date: event.createdAt, reason: event.data.reason as string | undefined})), ...approval.decisions.map(decision => ({id: decision.id, type: `approval.${decision.decision}`, actor: decision.actorId, date: decision.createdAt, reason: decision.reason}))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return <ol className={`incld-timeline ${className}`.trim()}>{items.map(item => <li key={item.id}><span className="incld-timeline-marker" /><div><strong>{eventLabel(item.type)}</strong><span>{item.actor ?? 'System'} · {formatDate(item.date)}</span>{item.reason && <p>{item.reason}</p>}</div></li>)}</ol>;
}

export interface ApprovalDetailsProps extends AsyncViewProps { approvalId: string; showActions?: boolean; showTimeline?: boolean; onResolved?: (approval: Approval) => void; className?: string }
export function ApprovalDetails({approvalId, showActions = true, showTimeline = true, onResolved, className = '', loading, error}: ApprovalDetailsProps) {
  const state = useApproval(approvalId);
  const [optimisticApproval, setOptimisticApproval] = useState<Approval>();
  useEffect(() => { if (state.data) setOptimisticApproval(state.data); }, [state.data]);
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading approval" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  const approval = optimisticApproval ?? state.data; if (!approval) return null;
  const resolved = (updated: Approval) => { setOptimisticApproval(updated); onResolved?.(updated); };
  return <article className={`incld-approval-details ${className}`.trim()}><header><div><div className="incld-title-row"><h3>{approval.title ?? approval.resourceId}</h3><span className={`incld-badge incld-badge-${approval.status}`}>{approval.status}</span></div>{approval.description && <p>{approval.description}</p>}</div></header><dl><div><dt>Requested</dt><dd>{formatDate(approval.createdAt)}</dd></div>{approval.requesterId && <div><dt>Requested by</dt><dd>{approval.requesterId}</dd></div>}</dl>{approval.status === 'pending' && showActions && <ApprovalActions approvalId={approval.id} onResolved={resolved} />}{showTimeline && <section><h4>History</h4><ApprovalTimeline approval={approval} /></section>}</article>;
}

export interface ApprovalGateProps extends ApprovalCheckInput { children: ReactNode; fallback?: ReactNode; pending?: ReactNode; refreshOnFocus?: boolean }
export function ApprovalGate({children, fallback = null, pending = null, refreshOnFocus = true, ...input}: ApprovalGateProps) {
  const state = useApprovalCheck(input, refreshOnFocus); if (state.status === 'loading') return <>{pending}</>; return <>{state.data?.approved ? children : fallback}</>;
}

export interface ApprovalPolicyListProps {
  onSelect?: (id: string) => void;
  selectedId?: string;
  className?: string;
}

export function ApprovalPolicyList({onSelect, selectedId, className = ''}: ApprovalPolicyListProps) {
  const state = useApprovalPolicies(); if (state.status === 'loading') return <IncldSpinner label="Loading policies" />; if (state.error) return <IncldErrorState error={state.error} retry={state.refresh} />; if (!state.data?.data.length) return <IncldEmptyState title="No approval policies" description="Requests use the default single-reviewer policy." />;
  return <div className={`incld-policy-list ${className}`.trim()}>{state.data.data.map(policy => <button type="button" key={policy.id} aria-pressed={selectedId === policy.id} onClick={() => onSelect?.(policy.id)}><span><strong>{policy.resourcePattern}</strong><small>{policy.mode} · {policy.requiredApprovals} required</small></span><span>{policy.allowedApprovers.length} reviewers</span></button>)}</div>;
}

export interface ApprovalPolicyEditorProps {
  policy?: ApprovalPolicy;
  onSaved?: (policy: ApprovalPolicy) => void;
  onDeleted?: (policy: ApprovalPolicy) => void;
  className?: string;
}

export function ApprovalPolicyEditor({policy, onSaved, onDeleted, className = ''}: ApprovalPolicyEditorProps) {
  const id = useId();
  const mutation = useApprovalPolicyMutation();
  const [resourcePattern, setResourcePattern] = useState(policy?.resourcePattern ?? '');
  const [approvers, setApprovers] = useState((policy?.allowedApprovers ?? []).join('\n'));
  const [mode, setMode] = useState<ApprovalPolicyMode>(policy?.mode ?? 'any');
  const [requiredApprovals, setRequiredApprovals] = useState(policy?.requiredApprovals ?? 1);
  const [allowSelfApproval, setAllowSelfApproval] = useState(policy?.allowSelfApproval ?? false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const resourceErrorId = `incld-policy-resource-error-${id}`;
  const approversErrorId = `incld-policy-approvers-error-${id}`;
  const requiredErrorId = `incld-policy-required-error-${id}`;
  const fieldMessages = errorMessagesFor(
    mutation.error,
    'resource_pattern',
    'project_id',
    'allowed_approvers',
    'mode',
    'required_approvals',
    'allow_self_approval',
  );
  useEffect(() => {
    setResourcePattern(policy?.resourcePattern ?? '');
    setApprovers((policy?.allowedApprovers ?? []).join('\n'));
    setMode(policy?.mode ?? 'any');
    setRequiredApprovals(policy?.requiredApprovals ?? 1);
    setAllowSelfApproval(policy?.allowSelfApproval ?? false);
    setConfirmingDelete(false);
  }, [policy?.id]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      resourcePattern: resourcePattern.trim(),
      allowedApprovers: approvers.split(/[,\n]/).map(value => value.trim()).filter(Boolean),
      mode,
      requiredApprovals,
      allowSelfApproval,
    };
    try {
      const result = policy ? await mutation.update(policy.id, input) : await mutation.create(input);
      onSaved?.(result);
    } catch {
      /* Preserve field state for retry. */
    }
  };
  const remove = async () => { if (!policy) return; try { const removed = await mutation.remove(policy.id); onDeleted?.(removed); } catch { /* Keep the editor mounted for retry. */ } };
  return <form className={`incld-policy-editor ${className}`.trim()} onSubmit={submit}><label className="incld-field"><span>Resource pattern</span><input className="incld-input" required value={resourcePattern} aria-invalid={errorMessagesFor(mutation.error, 'resource_pattern').length > 0 || undefined} aria-describedby={errorMessagesFor(mutation.error, 'resource_pattern').length ? resourceErrorId : undefined} onChange={event => setResourcePattern(event.target.value)} placeholder="release:*" /><small>Use a unique scope such as release:*; the wildcard * can only exist once.</small><IncldFieldError id={resourceErrorId} error={mutation.error} fields={['resource_pattern', 'project_id']} /></label><label className="incld-field"><span>Allowed reviewer IDs <small>One per line</small></span><textarea className="incld-input incld-textarea" required value={approvers} aria-invalid={errorMessagesFor(mutation.error, 'allowed_approvers').length > 0 || undefined} aria-describedby={errorMessagesFor(mutation.error, 'allowed_approvers').length ? approversErrorId : undefined} onChange={event => setApprovers(event.target.value)} placeholder={'reviewer_123\nteam_lead_456'} /><IncldFieldError id={approversErrorId} error={mutation.error} fields="allowed_approvers" /></label><div className="incld-policy-grid"><label className="incld-field"><span>Decision rule</span><select className="incld-input" value={mode} onChange={event => setMode(event.target.value as ApprovalPolicyMode)}><option value="any">Any reviewer</option><option value="all">All reviewers</option><option value="quorum">Quorum</option></select></label><label className="incld-field"><span>Approvals required</span><input className="incld-input" type="number" min={1} max={mode === 'quorum' ? Math.max(approvers.split(/[,\n]/).filter(value => value.trim()).length, 1) : undefined} value={requiredApprovals} aria-invalid={errorMessagesFor(mutation.error, 'required_approvals').length > 0 || undefined} aria-describedby={errorMessagesFor(mutation.error, 'required_approvals').length ? requiredErrorId : undefined} onChange={event => setRequiredApprovals(Number(event.target.value))} disabled={mode !== 'quorum'} /><IncldFieldError id={requiredErrorId} error={mutation.error} fields="required_approvals" /></label></div><label className="incld-checkbox"><input type="checkbox" checked={allowSelfApproval} onChange={event => setAllowSelfApproval(event.target.checked)} /><span>Allow requesters to approve their own request</span></label>{mutation.error && !fieldMessages.length && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}{confirmingDelete ? <div className="incld-policy-delete-confirmation" role="group" aria-label="Confirm policy deletion"><div><strong>Delete this policy?</strong><span>Existing requests keep their policy snapshot; future requests will no longer match it.</span></div><div className="incld-form-actions"><button type="button" className="incld-button incld-button-secondary" disabled={mutation.pending} onClick={() => setConfirmingDelete(false)}>Keep policy</button><IncldButton type="button" className="incld-button-danger" busy={mutation.pending} onClick={remove}>Delete policy</IncldButton></div></div> : <div className="incld-form-actions">{policy && <button type="button" className="incld-button incld-button-danger" disabled={mutation.pending} onClick={() => setConfirmingDelete(true)}>Delete</button>}<IncldButton type="submit" busy={mutation.pending}>{policy ? 'Save policy' : 'Create policy'}</IncldButton></div>}</form>;
}
