import {describe, expect, test} from 'bun:test';
import {
  IncldProvider,
  NextRun,
  RunHistory,
  ScheduleComposer,
  ScheduleDetails,
  ScheduleList,
  ScheduleTrigger,
  createIncld,
  defineActions,
  useRuns,
  useSchedule,
  useScheduleMutation,
  useSchedulePreview,
  useSchedules,
} from '../src/index.js';

describe('@incld/nextjs-schedules compatibility exports', () => {
  test('re-exports the current server and client API', () => {
    for (const value of [
      IncldProvider,
      NextRun,
      RunHistory,
      ScheduleComposer,
      ScheduleDetails,
      ScheduleList,
      ScheduleTrigger,
      createIncld,
      defineActions,
      useRuns,
      useSchedule,
      useScheduleMutation,
      useSchedulePreview,
      useSchedules,
    ]) {
      expect(typeof value).toBe('function');
    }
  });
});
