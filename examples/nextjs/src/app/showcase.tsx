'use client';

import {useState} from 'react';
import type {Approval, AuditEvent, ListAuditEventsParams, Schedule} from '@incld/client';
import {IncldProvider, useIncld} from '@incld/react';
import {
  NextRun,
  RunHistory,
  ScheduleComposer,
  ScheduleDetails,
  ScheduleList,
  ScheduleTrigger,
} from '@incld/react-schedules';
import {
  ApprovalDetails,
  ApprovalGate,
  ApprovalInbox,
  ApprovalPolicyEditor,
  ApprovalPolicyList,
  ApprovalRequestTrigger,
  useApprovalPolicy,
} from '@incld/react-approvals';
import {AuditEventDetails, AuditFilters, AuditTimeline} from '@incld/react-audit';
import {BulkOperationDetails, BulkOperationList} from '@incld/react-bulk';

type Notice = {tone: 'success' | 'error'; message: string};

const inventory = [
  {name: 'Schedules', href: '#schedules', count: 6},
  {name: 'Approvals', href: '#approvals', count: 9},
  {name: 'Bulk', href: '#bulk', count: 3},
  {name: 'Audit', href: '#audit', count: 3},
];

export function ComponentShowcase() {
  return (
    <IncldProvider
      baseUrl="/api/incld/v1"
      appearance={{colorScheme: 'light', accentColor: 'emerald', radius: 'large'}}
      onError={error => console.error('INCLD component error', error)}
    >
      <ShowcaseSections />
    </IncldProvider>
  );
}

function ShowcaseSections() {
  const {client, refresh} = useIncld();
  const [schedule, setSchedule] = useState<Schedule>();
  const [approval, setApproval] = useState<Approval>();
  const [auditEvent, setAuditEvent] = useState<AuditEvent>();
  const [auditFilters, setAuditFilters] = useState<ListAuditEventsParams>({});
  const [bulkId, setBulkId] = useState<string>();
  const [notice, setNotice] = useState<Notice>();
  const [auditBusy, setAuditBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const notify = (tone: Notice['tone'], message: string) => setNotice({tone, message});

  const syncActions = async () => {
    setSyncBusy(true);
    try {
      const response = await fetch('/api/demo/sync-actions', {method: 'POST'});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not sync actions.');
      refresh();
      notify('success', 'Demo actions are synced and ready to schedule.');
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not sync actions.');
    } finally {
      setSyncBusy(false);
    }
  };

  const recordAuditEvent = async () => {
    setAuditBusy(true);
    try {
      const event = await client.auditEvents.create(
        {
          type: 'report.exported',
          subjectType: 'report',
          subjectId: 'quarterly-demo',
          visibility: 'project',
          data: {format: 'pdf', surface: 'next-reference'},
        },
        {idempotencyKey: crypto.randomUUID()},
      );
      setAuditEvent(event);
      refresh();
      notify('success', 'Audit event recorded.');
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not record the event.');
    } finally {
      setAuditBusy(false);
    }
  };

  const startBulkOperation = async () => {
    setBulkBusy(true);
    try {
      const response = await fetch('/api/demo/bulk', {method: 'POST'});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not start the demo batch.');
      setBulkId(body.data.id);
      refresh();
      notify('success', 'Bulk operation started.');
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not start the demo batch.');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="shell showcase">
      <nav className="playground-nav" aria-label="Component playground">
        <div>
          <strong>Component playground</strong>
          <span>21 public components · same-origin proxy</span>
        </div>
        <div className="playground-links">
          {inventory.map(item => (
            <a key={item.href} href={item.href}>
              {item.name}<span>{item.count}</span>
            </a>
          ))}
        </div>
        <button className="setup-action" type="button" disabled={syncBusy} onClick={syncActions}>
          {syncBusy ? 'Syncing…' : 'Sync demo actions'}
        </button>
      </nav>

      {notice && (
        <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(undefined)}>Dismiss</button>
        </div>
      )}

      <section className="feature-section" id="schedules">
        <SectionHeading number="01" title="Schedules" description="Create, inspect, edit, pause, resume, and delete schedules without leaving the current product surface.">
          <ScheduleTrigger
            action="generate_report"
            defaultPayload={{accountId: 'account_demo'}}
            onCreated={created => {
              setSchedule(created);
              notify('success', 'Schedule created from the dialog trigger.');
            }}
          >
            Schedule report
          </ScheduleTrigger>
        </SectionHeading>
        <div className="component-grid">
          <DemoCard label="Schedule composer">
            <ScheduleComposer
              action="generate_report"
              payload={{accountId: 'account_demo'}}
              onSaved={created => {
                setSchedule(created);
                notify('success', 'Schedule created without a page navigation.');
              }}
            />
          </DemoCard>
          <DemoCard label="Schedule list"><ScheduleList onSelect={setSchedule} /></DemoCard>
        </div>
        <div className="component-grid">
          <DemoCard label="Schedule details">
            {schedule ? (
              <ScheduleDetails
                scheduleId={schedule.id}
                onUpdated={updated => {
                  setSchedule(updated);
                  notify('success', 'Schedule updated in place.');
                }}
                onDeleted={() => {
                  setSchedule(undefined);
                  notify('success', 'Schedule deleted.');
                }}
              />
            ) : (
              <Placeholder title="Select a schedule" body="Its optimistic edit and lifecycle controls appear here." />
            )}
          </DemoCard>
          <DemoCard label="Next run and execution history">
            {schedule ? (
              <>
                <div className="inline-summary"><span>Next run</span><NextRun schedule={schedule} /></div>
                <RunHistory scheduleId={schedule.id} />
              </>
            ) : (
              <Placeholder title="No schedule selected" body="Run history follows the selected schedule." />
            )}
          </DemoCard>
        </div>
      </section>

      <section className="feature-section" id="approvals">
        <SectionHeading number="02" title="Approvals" description="Request, review, gate, and configure approval policy while identity remains server-owned.">
          <ApprovalRequestTrigger
            resourceType="release"
            resourceId="release:next-reference"
            action="publish"
            title="Publish the Next.js reference"
            onCreated={created => {
              setApproval(created);
              notify('success', 'Approval request sent.');
            }}
          >
            Request approval
          </ApprovalRequestTrigger>
        </SectionHeading>
        <div className="component-grid">
          <DemoCard label="Assigned inbox"><ApprovalInbox view="assigned" onSelect={setApproval} /></DemoCard>
          <DemoCard label="Protected product state">
            <ApprovalGate
              resourceType="release"
              resourceId="release:next-reference"
              action="publish"
              pending={<Placeholder title="Checking approval" body="Resolving trusted product context…" />}
              fallback={<div className="gate gate-locked"><strong>Release locked</strong><span>An approved request is required to expose publishing controls.</span></div>}
            >
              <div className="gate gate-open"><strong>Ready to publish</strong><span>The trusted approval check passed.</span></div>
            </ApprovalGate>
          </DemoCard>
        </div>
        {approval && <DemoCard label="Approval details, actions, and timeline"><ApprovalDetails approvalId={approval.id} onResolved={setApproval} /></DemoCard>}
        <PolicyPlayground notify={notify} />
      </section>

      <section className="feature-section" id="bulk">
        <SectionHeading number="03" title="Bulk operations" description="Launch batches on the server; inspect live progress, partial failure, chunks, cancellation, and events.">
          <button className="demo-action" type="button" disabled={bulkBusy} onClick={startBulkOperation}>
            {bulkBusy ? 'Starting…' : 'Start contact sync'}
          </button>
        </SectionHeading>
        <div className="component-grid">
          <DemoCard label="Operation history"><BulkOperationList onSelect={setBulkId} /></DemoCard>
          <DemoCard label="Progress, chunks, and events">
            {bulkId ? <BulkOperationDetails operationId={bulkId} /> : <Placeholder title="Select an operation" body="Live progress and delivery inspection appear here." />}
          </DemoCard>
        </div>
      </section>

      <section className="feature-section" id="audit">
        <SectionHeading number="04" title="Audit" description="Use one controlled filter state across the filter bar, timeline, and event inspector.">
          <button className="demo-action" type="button" disabled={auditBusy} onClick={recordAuditEvent}>
            {auditBusy ? 'Recording…' : 'Record audit event'}
          </button>
        </SectionHeading>
        <DemoCard label="Controlled filters and timeline">
          <AuditFilters value={auditFilters} onChange={setAuditFilters} />
          <AuditTimeline filters={auditFilters} onSelect={setAuditEvent} />
        </DemoCard>
        {auditEvent && <DemoCard label="Event details"><AuditEventDetails event={auditEvent} /></DemoCard>}
      </section>
    </div>
  );
}

function PolicyPlayground({notify}: {notify: (tone: Notice['tone'], message: string) => void}) {
  const [selectedId, setSelectedId] = useState<string>();
  const policy = useApprovalPolicy(selectedId);

  return (
    <div className="component-grid">
      <DemoCard label="Approval policy list">
        <ApprovalPolicyList selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId && <button className="new-policy-action" type="button" onClick={() => setSelectedId(undefined)}>Create another policy</button>}
      </DemoCard>
      <DemoCard label={selectedId ? 'Approval policy editor' : 'New approval policy'}>
        {selectedId && !policy.data ? (
          <Placeholder title="Loading policy" body="Fetching the selected policy definition…" />
        ) : (
          <ApprovalPolicyEditor
            key={policy.data?.id ?? 'new-policy'}
            policy={policy.data}
            onSaved={saved => {
              setSelectedId(saved.id);
              notify('success', 'Approval policy saved.');
            }}
            onDeleted={() => {
              setSelectedId(undefined);
              notify('success', 'Approval policy deleted.');
            }}
          />
        )}
      </DemoCard>
    </div>
  );
}

function SectionHeading({number, title, description, children}: {number: string; title: string; description: string; children: React.ReactNode}) {
  return <header className="section-heading"><div><span>{number}</span><h2>{title}</h2><p>{description}</p></div><div>{children}</div></header>;
}

function DemoCard({label, children}: {label: string; children: React.ReactNode}) {
  return <div className="demo-card"><div className="demo-card-label">{label}</div><div className="demo-card-body">{children}</div></div>;
}

function Placeholder({title, body}: {title: string; body: string}) {
  return <div className="placeholder"><strong>{title}</strong><span>{body}</span></div>;
}
