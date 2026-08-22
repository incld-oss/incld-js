import {describe, expect, test} from 'bun:test';
import {
  ApprovalActions,
  ApprovalDetails,
  ApprovalGate,
  ApprovalInbox,
  ApprovalPolicyEditor,
  ApprovalPolicyList,
  ApprovalRequestDialog,
  ApprovalRequestTrigger,
  ApprovalTimeline,
  IncldProvider,
  createIncld,
  defineActions,
  useApproval,
  useApprovalCheck,
  useApprovalMutation,
  useApprovalPolicies,
  useApprovalPolicy,
  useApprovalPolicyMutation,
  useApprovals,
} from '../src/index.js';

describe('@incld/nextjs-approvals compatibility exports', () => {
  test('re-exports the current server and client API', () => {
    for (const value of [
      ApprovalActions,
      ApprovalDetails,
      ApprovalGate,
      ApprovalInbox,
      ApprovalPolicyEditor,
      ApprovalPolicyList,
      ApprovalRequestDialog,
      ApprovalRequestTrigger,
      ApprovalTimeline,
      IncldProvider,
      createIncld,
      defineActions,
      useApproval,
      useApprovalCheck,
      useApprovalMutation,
      useApprovalPolicies,
      useApprovalPolicy,
      useApprovalPolicyMutation,
      useApprovals,
    ]) {
      expect(typeof value).toBe('function');
    }
  });
});
