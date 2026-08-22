import {useCallback, useState} from 'react';
import {IncldError, type ListRunsParams, type ListSchedulesParams, type RequestOptions, type ScheduleInput} from '@incld/client';
import {useAsyncResource, useIncld} from '@incld/react';

export function useSchedules(params: ListSchedulesParams = {}) {
  const {client, version} = useIncld();
  const key = JSON.stringify(params);
  return useAsyncResource(signal => client.schedules.list(params, {signal}), [client, version, key]);
}

export function useSchedule(id?: string) {
  const {client, version} = useIncld();
  return useAsyncResource(async signal => id ? client.schedules.get(id, {signal}) : undefined, [client, version, id]);
}

export function useRuns(params: ListRunsParams = {}, scheduleId?: string) {
  const {client, version} = useIncld();
  const key = JSON.stringify(params);
  return useAsyncResource(
    signal => scheduleId
      ? client.schedules.runs(scheduleId, params, {signal})
      : client.runs.list(params, {signal}),
    [client, version, scheduleId, key],
  );
}

export function useSchedulePreview(input?: Pick<ScheduleInput, 'recurrence'>) {
  const {client} = useIncld();
  const key = JSON.stringify(input);
  return useAsyncResource(
    async signal => input ? client.schedules.preview({...input, count: 5}, {signal}) : undefined,
    [client, key],
  );
}

export function useScheduleMutation() {
  const {client, refresh, reportError} = useIncld();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<IncldError>();

  const mutate = useCallback(async <T,>(operation: (options: RequestOptions) => Promise<T>) => {
    setPending(true);
    setError(undefined);
    try {
      const result = await operation({idempotencyKey: crypto.randomUUID()});
      refresh();
      return result;
    } catch (value) {
      const normalized = value instanceof IncldError
        ? value
        : new IncldError(value instanceof Error ? value.message : 'Request failed', {status: 0, code: 'request_failed'});
      setError(normalized);
      reportError(normalized);
      throw normalized;
    } finally {
      setPending(false);
    }
  }, [client, refresh, reportError]);

  return {
    pending,
    error,
    create: (input: ScheduleInput) => mutate(options => client.schedules.create(input, options)),
    update: (id: string, input: Partial<ScheduleInput>) => mutate(options => client.schedules.update(id, input, options)),
    pause: (id: string) => mutate(options => client.schedules.pause(id, options)),
    resume: (id: string) => mutate(options => client.schedules.resume(id, options)),
    remove: (id: string) => mutate(options => client.schedules.remove(id, options)),
  };
}
