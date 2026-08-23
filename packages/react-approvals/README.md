# @incld/react-approvals

React request, reviewer, policy, and presentation-gate components for durable human approvals. Render them inside `IncldProvider` and use a trusted framework proxy.

```bash
npm install @incld/client @incld/react @incld/react-approvals
```

```tsx
import {ApprovalDetails, ApprovalInbox, ApprovalRequestTrigger} from '@incld/react-approvals';
import '@incld/react-approvals/styles.css';

<ApprovalRequestTrigger
  resourceType="deployment"
  resourceId="production:checkout"
  action="deploy"
  title="Deploy checkout to production"
/>
<ApprovalInbox view="assigned" onSelect={approval => setApprovalId(approval.id)} />
{approvalId && <ApprovalDetails approvalId={approvalId} />}
```

Do not pass `externalOrganizationId`, `requesterId`, reviewer identity, or actor identity from React. Those fields exist on shared server types, but the browser proxy removes them and injects the active `context.organization.id` and `context.user.id`.

## Request components

`ApprovalRequestTrigger` requires `resourceType`, `resourceId`, and `action`. It accepts `policy?`, `title?`, `description?`, `metadata?`, `expiresAt?`, `onCreated?(approval)`, children, and native button props except `action`/`onError`.

`ApprovalRequestDialog` accepts the same request input plus required `open` and `onOpenChange(open)`, with optional `onCreated` and `className`. Its note textarea writes the approval `description`.

## Reviewer and detail components

| Component | Props and behavior |
| --- | --- |
| `ApprovalInbox` | `view='assigned'`, `filters?`, `pageSize=25`, `renderItem?(approval)`, `onSelect?(approval)`, `className?`, async renderers. `requested` scopes to requester; authorize `all` carefully. |
| `ApprovalActions` | Required `approvalId`; `visible` defaults to approve/reject and may include cancel/revoke; `onResolved?(approval)`, `className?`. Reject/cancel/revoke forms require a reason; approval note is optional. |
| `ApprovalTimeline` | Required `approval`; optional `className`. Chronologically merges events and decisions. |
| `ApprovalDetails` | Required `approvalId`; `showActions=true`, `showTimeline=true`, `onResolved?`, `className?`, `loading?`, `error?`. |

## ApprovalGate

```tsx
<ApprovalGate
  resourceType="deployment"
  resourceId="production:checkout"
  action="deploy"
  pending={<Spinner />}
  fallback={<ApprovalRequired />}
>
  <DeployControls />
</ApprovalGate>
```

Required props are `resourceType`, `resourceId`, `action`, and `children`; optional props are `fallback`, `pending`, and `refreshOnFocus=true`.

`ApprovalGate` is presentation only. Immediately before a sensitive mutation, call `approvals.check` on the trusted server and deny execution unless `approved` is true.

## Policy components

- `ApprovalPolicyList`: `onSelect?(id)`, `selectedId?`, `className?`.
- `ApprovalPolicyEditor`: `policy?` for edit mode, `onSaved?(policy)`, `onDeleted?(policy)`, `className?`. Without `policy`, it creates.

Explicitly authorize `approval_policies.read`, `.create`, `.update`, and `.delete` in the framework callback. The proxy denies all four when no callback is configured. Organization admins can manage only their own policies; project-global fallbacks remain trusted-server managed.

## Hooks

- `useApprovals(params?)`, `useApproval(id?)`, and `useApprovalCheck(input?, refreshOnFocus=true)`.
- `useApprovalMutation()` returns `pending`, `error`, and `create`, `update`, `approve`, `reject`, `cancel`, `revoke` methods.
- `useApprovalPolicies()` and `useApprovalPolicy(id?)` read policies.
- `useApprovalPolicyMutation()` returns `create(input)`, `update(id, partialInput)`, and `remove(id)` with shared `pending`/`error` state.

Successful mutations refresh provider query hooks and errors are reported through `IncldProvider.onError`.
