export interface RealtimeRefreshRuntime {
  visibilityState: 'hidden' | 'visible';
  setInterval: (callback: () => void, interval: number) => number;
  clearInterval: (handle: number) => void;
  addVisibilityListener: (callback: () => void) => void;
  removeVisibilityListener: (callback: () => void) => void;
}

export const defaultRefreshInterval = 5_000;

export function resolveRefreshInterval(interval: number | false): number | false {
  if (interval === false || !Number.isFinite(interval) || interval <= 0) return false;
  return Math.max(interval, 1_000);
}

function browserRuntime(): RealtimeRefreshRuntime | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

  return {
    get visibilityState() {
      return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
    },
    setInterval: (callback, interval) => window.setInterval(callback, interval),
    clearInterval: handle => window.clearInterval(handle),
    addVisibilityListener: callback => document.addEventListener('visibilitychange', callback),
    removeVisibilityListener: callback => document.removeEventListener('visibilitychange', callback),
  };
}

export function startRealtimeRefresh(
  refresh: () => void,
  interval: number | false,
  runtime: RealtimeRefreshRuntime | undefined = browserRuntime(),
): (() => void) | undefined {
  if (interval === false || !runtime) return undefined;

  const refreshIfVisible = () => {
    if (runtime.visibilityState === 'visible') refresh();
  };
  const timer = runtime.setInterval(refreshIfVisible, interval);
  runtime.addVisibilityListener(refreshIfVisible);

  return () => {
    runtime.clearInterval(timer);
    runtime.removeVisibilityListener(refreshIfVisible);
  };
}
