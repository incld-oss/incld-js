# @incld/svelte-approvals

Svelte components for durable incld approval workflows.

The package mirrors the React lifecycle surface:

- `ApprovalButton` creates a request.
- `ApprovalList` renders request queues, status and policy progress.
- `ApprovalActions` approves, rejects, cancels or revokes with an audited reason.
- `ApprovalDetails` renders request metadata, policy snapshots, decisions and lifecycle timestamps.
- `ApprovalHistory` renders immutable events and decisions; entries open into a full-detail modal and the complete audit envelope can be exported as JSON.
- `ApprovalPolicyList` lists and manages `any`, `all` and `quorum` policies.

Browser lifecycle commands should always flow through the incld proxy handler. The proxy derives actor identity from your application authentication and overwrites browser-supplied requester/reviewer fields before forwarding the command.
