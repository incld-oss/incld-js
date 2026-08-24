<script lang="ts">
  import type { Approval } from '@incld/client';

  export let approval: Approval;
  export let title = 'Audit log';
  export let exportable = true;

  type AuditEntry = {
    kind: 'event' | 'decision';
    id: string;
    createdAt: string;
    type: string;
    actor: string;
    reason?: string;
    data: Record<string, unknown>;
  };

  let selected: AuditEntry | null = null;

  $: entries = [
    ...approval.events.map(event => ({
      kind: 'event' as const,
      id: event.id,
      createdAt: event.createdAt,
      type: event.type,
      actor: event.actorId || 'system',
      reason: typeof event.data.reason === 'string' ? event.data.reason : undefined,
      data: event.data,
    })),
    ...approval.decisions.map(decision => ({
      kind: 'decision' as const,
      id: decision.id,
      createdAt: decision.createdAt,
      type: `approval.decision.${decision.decision}`,
      actor: decision.actorId,
      reason: decision.reason,
      data: { decision: decision.decision, reason: decision.reason },
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  function downloadAudit() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      approval: {
        id: approval.id,
        projectId: approval.projectId,
        resourceId: approval.resourceId,
        requesterId: approval.requesterId,
        approverId: approval.approverId,
        status: approval.status,
        title: approval.title,
        description: approval.description,
        metadata: approval.metadata,
        revision: approval.revision,
        policyId: approval.policyId,
        policySnapshot: approval.policySnapshot,
        idempotencyKey: approval.idempotencyKey,
        expiresAt: approval.expiresAt,
        resolvedAt: approval.resolvedAt,
        cancelledAt: approval.cancelledAt,
        revokedAt: approval.revokedAt,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
      entries,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval-audit-${approval.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
</script>

<section class="incld-audit-log">
  <header class="incld-audit-header">
    <div>
      <h4>{title}</h4>
      <p>Append-only request events and reviewer decisions, oldest first.</p>
    </div>
    {#if exportable}<button type="button" class="incld-control" on:click={downloadAudit}>Export JSON</button>{/if}
  </header>

  <ol class="incld-approval-timeline" aria-label="Approval audit history">
    {#if entries.length === 0}<li class="incld-empty-state">No audit entries yet.</li>{/if}
    {#each entries as entry (`${entry.kind}-${entry.id}`)}
      <li class="incld-audit-entry">
        <button type="button" class="incld-audit-entry-button" on:click={() => selected = entry}>
          <div>
            <strong><span class={`incld-audit-kind incld-audit-kind-${entry.kind}`}>{entry.kind}</span>{entry.type}</strong>
            <div>{entry.actor} · {new Date(entry.createdAt).toLocaleString()}{entry.reason ? ` · ${entry.reason}` : ''}</div>
          </div>
          <span aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ol>

  {#if selected}
    <div class="incld-audit-modal" role="dialog" aria-modal="true" aria-label="Audit entry details">
      <button type="button" class="incld-audit-backdrop" aria-label="Close audit entry" on:click={() => selected = null}></button>
      <article class="incld-audit-modal-card">
        <header class="incld-audit-modal-header">
          <div>
            <div class="incld-audit-modal-kicker"><span class={`incld-audit-kind incld-audit-kind-${selected.kind}`}>{selected.kind}</span><code>{selected.id}</code></div>
            <h3>{selected.type}</h3>
            <p>{new Date(selected.createdAt).toLocaleString()}</p>
          </div>
          <button type="button" class="incld-control" on:click={() => selected = null}>Close</button>
        </header>

        <div class="incld-audit-modal-body">
          <div class="incld-details-grid">
            <div><span>Actor</span><strong>{selected.actor}</strong></div>
            <div><span>Kind</span><strong>{selected.kind}</strong></div>
            <div><span>Request ID</span><strong>{approval.id}</strong></div>
            <div><span>Resource</span><strong>{approval.resourceId}</strong></div>
            <div><span>Requester</span><strong>{approval.requesterId || '—'}</strong></div>
            <div><span>Request status</span><strong>{approval.status}</strong></div>
          </div>

          <section class="incld-section"><h4>Reason</h4><div class="incld-audit-reason">{selected.reason || 'No reason recorded.'}</div></section>
          <section class="incld-section"><h4>Entry payload</h4><pre class="incld-code">{JSON.stringify(selected.data, null, 2)}</pre></section>
          <section class="incld-section"><h4>Policy snapshot at request time</h4><pre class="incld-code">{JSON.stringify(approval.policySnapshot, null, 2)}</pre></section>
          <section class="incld-section"><h4>Request metadata</h4><pre class="incld-code">{JSON.stringify(approval.metadata, null, 2)}</pre></section>
        </div>
      </article>
    </div>
  {/if}
</section>

<style>
  .incld-audit-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.6rem; }
  .incld-audit-header h4 { margin:0; font-size:.72rem;  letter-spacing:.08em; }
  .incld-audit-header p { margin:.2rem 0 0; font-size:.7rem; opacity:.62; }
  .incld-approval-timeline { list-style:none; margin:0; padding:0; overflow:hidden; border:1px solid rgba(255,255,255,.08); border-radius:12px; }
  .incld-audit-entry { border-bottom:1px solid rgba(255,255,255,.08); }
  .incld-audit-entry:last-child { border-bottom:0; }
  .incld-audit-entry-button { width:100%; display:flex; justify-content:space-between; gap:1rem; padding:.8rem; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }
  .incld-audit-entry-button:hover { background:rgba(255,255,255,.04); }
  .incld-audit-entry-button strong { font-size:.82rem; }
  .incld-audit-entry-button div div { margin-top:.2rem; font-size:.7rem; opacity:.68; }
  .incld-audit-kind { display:inline-flex; margin-right:.4rem; padding:.08rem .4rem; border-radius:999px; font-size:.56rem;  letter-spacing:.05em; }
  .incld-audit-kind-event { background:rgba(56,189,248,.1); color:#7dd3fc; }
  .incld-audit-kind-decision { background:rgba(199,246,90,.1); color:#c7f65a; }
  .incld-control { border:1px solid rgba(255,255,255,.08); border-radius:8px; background:rgba(255,255,255,.05); color:inherit; padding:.45rem .7rem; cursor:pointer; }
  .incld-audit-modal { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
  .incld-audit-backdrop { position:fixed; inset:0; border:0; background:rgba(0,0,0,.72); backdrop-filter:blur(3px); }
  .incld-audit-modal-card { position:relative; z-index:1; width:min(720px,calc(100vw - 2rem)); max-height:88vh; overflow-y:auto; border:1px solid rgba(255,255,255,.08); border-radius:12px; background:#1e1e1e; color:#f7f7f3; }
  .incld-audit-modal-header { display:flex; justify-content:space-between; gap:1rem; padding:1rem; border-bottom:1px solid rgba(255,255,255,.08); }
  .incld-audit-modal-header h3 { margin:.5rem 0 .2rem; font-size:1rem; }
  .incld-audit-modal-header p { margin:0; font-size:.7rem; opacity:.6; }
  .incld-audit-modal-kicker { display:flex; align-items:center; gap:.35rem; }
  .incld-audit-modal-kicker code { font-size:.62rem; opacity:.55; }
  .incld-details-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; padding:1rem; }
  .incld-details-grid > div { padding:.7rem; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:#151515; }
  .incld-details-grid span { display:block; font-size:.65rem; opacity:.55; }
  .incld-details-grid strong { display:block; margin-top:.25rem; font-size:.74rem; word-break:break-word; }
  .incld-section { padding:1rem; border-top:1px solid rgba(255,255,255,.08); }
  .incld-section h4 { margin:0 0 .6rem; font-size:.68rem;  letter-spacing:.08em; opacity:.7; }
  .incld-code { overflow:auto; margin:0; padding:.75rem; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:#151515; font-size:.68rem; }
  .incld-audit-reason { padding:.75rem; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:#151515; font-size:.75rem; }
  @media (max-width:640px) { .incld-details-grid { grid-template-columns:1fr; } .incld-audit-header { flex-direction:column; } }
</style>
