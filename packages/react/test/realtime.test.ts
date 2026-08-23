import {describe, expect, test} from 'bun:test';
import {
  resolveRefreshInterval,
  startRealtimeRefresh,
  type RealtimeRefreshRuntime,
} from '../src/realtime.js';

describe('realtime refresh scheduling', () => {
  test('normalizes configured intervals', () => {
    expect(resolveRefreshInterval(5_000)).toBe(5_000);
    expect(resolveRefreshInterval(100)).toBe(1_000);
    expect(resolveRefreshInterval(0)).toBe(false);
    expect(resolveRefreshInterval(Number.NaN)).toBe(false);
    expect(resolveRefreshInterval(false)).toBe(false);
  });

  test('refreshes only while visible, refreshes on return, and cleans up', () => {
    let intervalCallback = () => {};
    let visibilityCallback = () => {};
    let clearedHandle: number | undefined;
    let removed = false;
    let refreshes = 0;
    const runtime: RealtimeRefreshRuntime = {
      visibilityState: 'hidden',
      setInterval(callback, interval) {
        expect(interval).toBe(5_000);
        intervalCallback = callback;
        return 42;
      },
      clearInterval(handle) {
        clearedHandle = handle;
      },
      addVisibilityListener(callback) {
        visibilityCallback = callback;
      },
      removeVisibilityListener(callback) {
        removed = callback === visibilityCallback;
      },
    };

    const stop = startRealtimeRefresh(() => { refreshes += 1; }, 5_000, runtime);
    intervalCallback();
    expect(refreshes).toBe(0);

    runtime.visibilityState = 'visible';
    intervalCallback();
    visibilityCallback();
    expect(refreshes).toBe(2);

    stop?.();
    expect(clearedHandle).toBe(42);
    expect(removed).toBe(true);
  });
});
