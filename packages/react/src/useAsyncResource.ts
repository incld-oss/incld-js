import {useCallback, useEffect, useRef, useState, type DependencyList} from 'react';
import {IncldError} from '@incld/client';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAsyncResource<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: DependencyList) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [state, setState] = useState<{
    data?: T; error?: IncldError; status: AsyncStatus; revision: number;
  }>({status: 'idle', revision: 0});
  const refresh = useCallback(() => setState(value => ({...value, revision: value.revision + 1})), []);

  useEffect(() => {
    const controller = new AbortController();
    setState(value => ({...value, status: 'loading', error: undefined}));
    loaderRef.current(controller.signal).then(
      data => { if (!controller.signal.aborted) setState(value => ({...value, data, status: 'success'})); },
      error => {
        if (!controller.signal.aborted) {
          const normalized = error instanceof IncldError
            ? error
            : new IncldError(error instanceof Error ? error.message : 'Request failed', {status: 0, code: 'request_failed'});
          setState(value => ({...value, error: normalized, status: 'error'}));
        }
      },
    );
    return () => controller.abort();
  }, [...dependencies, state.revision]);

  return {data: state.data, error: state.error, status: state.status, refresh};
}
