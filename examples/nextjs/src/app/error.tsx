'use client';

export default function ErrorPage({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return (
    <main className="route-state" role="alert">
      <span className="route-state-error" aria-hidden="true">!</span>
      <strong>The playground could not start</strong>
      <p>{error.message}</p>
      <button className="demo-action" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
