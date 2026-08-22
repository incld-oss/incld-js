export default function Loading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <span className="route-state-pulse" aria-hidden="true" />
      <strong>Loading the component playground…</strong>
    </main>
  );
}
