import React, {useEffect, useState, type ButtonHTMLAttributes, type ReactNode} from 'react';
import type {ListRunsParams, ListSchedulesParams, Schedule} from '@incld/client';
import {IncldButton, IncldDialog, IncldEmptyState, IncldErrorState, IncldSpinner, type AsyncViewProps} from '@incld/react';
import {ScheduleComposer, type ScheduleComposerProps} from './ScheduleComposer.js';
import {useRuns, useSchedule, useScheduleMutation, useSchedules} from './hooks.js';
import {formatDate, scheduleSummary} from './utils.js';

export interface ScheduleTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onError'> {
  action: string; defaultPayload?: Record<string, unknown>;
  defaultSchedule?: ScheduleComposerProps['defaultValue'];
  onCreated?: (schedule: Schedule) => void; dialogTitle?: string; dialogClassName?: string;
}

export function ScheduleTrigger({action, defaultPayload, defaultSchedule, onCreated, dialogTitle = 'Create a schedule', dialogClassName = '', children = 'Schedule', ...button}: ScheduleTriggerProps) {
  const [open, setOpen] = useState(false);
  return <><IncldButton {...button} type="button" onClick={event => {button.onClick?.(event); setOpen(true);}}>{children}</IncldButton><IncldDialog open={open} onOpenChange={setOpen} className={dialogClassName} title={dialogTitle} description="Set when this action should run."><ScheduleComposer action={action} payload={defaultPayload} defaultValue={defaultSchedule} onCancel={() => setOpen(false)} onSaved={schedule => {setOpen(false); onCreated?.(schedule);}} /></IncldDialog></>;
}

export interface ScheduleListProps extends AsyncViewProps {
  filters?: ListSchedulesParams; pageSize?: number; renderItem?: (schedule: Schedule) => ReactNode;
  onSelect?: (schedule: Schedule) => void; className?: string;
}

export function ScheduleList({filters = {}, pageSize = 25, renderItem, onSelect, loading, empty, error, className = ''}: ScheduleListProps) {
  const state = useSchedules({...filters, limit: pageSize});
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading schedules" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="No schedules yet" description="Create a schedule to automate this action." />}</>;
  return <div className={`incld-list ${className}`} role="list">{state.data.data.map(schedule => <div key={schedule.id} className="incld-row" role="listitem">{renderItem ? renderItem(schedule) : <button type="button" className="incld-row-button" onClick={() => onSelect?.(schedule)}><span className="incld-row-content"><strong>{schedule.action.displayName}</strong><small>{scheduleSummary(schedule)}</small></span><span className="incld-row-aside"><span className={`incld-badge incld-badge-${schedule.status}`}>{schedule.status}</span><small>{formatDate(schedule.nextRunAt)}</small></span></button>}</div>)}</div>;
}

export interface ScheduleDetailsProps extends AsyncViewProps {
  scheduleId: string; onUpdated?: (schedule: Schedule) => void; onDeleted?: (schedule: Schedule) => void;
  className?: string;
}

export function ScheduleDetails({scheduleId, onUpdated, onDeleted, className = '', loading, error}: ScheduleDetailsProps) {
  const state = useSchedule(scheduleId); const mutation = useScheduleMutation(); const [editing, setEditing] = useState(false); const [confirmingDelete, setConfirmingDelete] = useState(false); const [optimisticSchedule, setOptimisticSchedule] = useState<Schedule>();
  useEffect(() => { if (state.data) setOptimisticSchedule(state.data); }, [state.data]);
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading schedule" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  const schedule = optimisticSchedule ?? state.data; if (!schedule) return null;
  if (editing) return <ScheduleComposer action={schedule.action.identifier} scheduleId={schedule.id} initialSchedule={schedule} mode="edit" onCancel={() => setEditing(false)} onSaved={saved => {setOptimisticSchedule(saved); setEditing(false); onUpdated?.(saved);}} />;
  const control = async () => {
    try {
      const saved = schedule.status === 'paused' ? await mutation.resume(schedule.id) : await mutation.pause(schedule.id);
      setOptimisticSchedule(saved);
      onUpdated?.(saved);
    } catch {
      // The mutation hook renders and reports the error without replacing this view.
    }
  };
  const remove = async () => {
    try {
      onDeleted?.(await mutation.remove(schedule.id));
    } catch {
      // The mutation hook renders and reports the error without replacing this view.
    }
  };
  return <article className={`incld-details ${className}`.trim()}><header><div><div className="incld-title-row"><h3>{schedule.action.displayName}</h3><span className={`incld-badge incld-badge-${schedule.status}`}>{schedule.status}</span></div><p>{scheduleSummary(schedule)}</p></div><button type="button" className="incld-icon-button" aria-label="Edit schedule" onClick={() => setEditing(true)}>✎</button></header><dl><div><dt>Next run</dt><dd>{formatDate(schedule.nextRunAt)}</dd></div><div><dt>Last run</dt><dd>{formatDate(schedule.lastRunAt)}</dd></div></dl>{mutation.error && <div className="incld-inline-error" role="alert">{mutation.error.message}</div>}{confirmingDelete ? <div className="incld-delete-confirmation" role="group" aria-label="Confirm schedule deletion"><div><strong>Delete this schedule?</strong><span>Future runs will no longer be created.</span></div><div className="incld-form-actions"><button type="button" className="incld-button incld-button-secondary" disabled={mutation.pending} onClick={() => setConfirmingDelete(false)}>Keep schedule</button><IncldButton type="button" className="incld-button-danger" busy={mutation.pending} onClick={remove}>Delete schedule</IncldButton></div></div> : <footer><IncldButton type="button" className="incld-button-secondary" busy={mutation.pending} onClick={control}>{schedule.status === 'paused' ? 'Resume' : 'Pause'}</IncldButton><IncldButton type="button" className="incld-button-danger" busy={mutation.pending} onClick={() => setConfirmingDelete(true)}>Delete</IncldButton></footer>}</article>;
}

export interface RunHistoryProps extends AsyncViewProps { scheduleId?: string; filters?: ListRunsParams; locale?: string; timeZone?: string; className?: string }
export function RunHistory({scheduleId, filters = {}, locale, timeZone, className = '', loading, empty, error}: RunHistoryProps) {
  const state = useRuns(filters, scheduleId);
  if (state.status === 'loading' && !state.data) return <>{loading ?? <IncldSpinner label="Loading run history" />}</>;
  if (state.error) return <>{error?.(state.error, state.refresh) ?? <IncldErrorState error={state.error} retry={state.refresh} />}</>;
  if (!state.data?.data.length) return <>{empty ?? <IncldEmptyState title="No runs yet" description="Execution history will appear after the first occurrence." />}</>;
  const showAttempts = state.data.data.some(run => run.attemptCount > 1);
  return <div className={`incld-history ${showAttempts ? 'incld-history-with-attempts' : ''} ${className}`.trim()} role="table" aria-label="Schedule run history"><div className="incld-history-header" role="row"><span>Status</span><span>Scheduled</span>{showAttempts && <span>Attempts</span>}</div>{state.data.data.map(run => <div className="incld-history-row" role="row" key={run.id}><span><span className={`incld-status-dot incld-status-${run.status}`} />{run.status}</span><span>{formatDate(run.nominalAt, locale, timeZone)}</span>{showAttempts && <span>{run.attemptCount}</span>}{run.error && <small role="alert">{run.error}</small>}</div>)}</div>;
}

export interface NextRunProps { schedule?: Schedule; scheduleId?: string; format?: 'relative' | 'absolute' | 'both'; locale?: string; timeZone?: string; className?: string }
export function NextRun({schedule: supplied, scheduleId, format = 'both', locale, timeZone, className = ''}: NextRunProps) {
  const state = useSchedule(supplied ? undefined : scheduleId); const schedule = supplied ?? state.data;
  if (!schedule?.nextRunAt) return <span className={`incld-next-run ${className}`.trim()}>{schedule ? 'No upcoming run' : 'Not scheduled'}</span>;
  const absolute = formatDate(schedule.nextRunAt, locale, timeZone); const minutes = Math.round((new Date(schedule.nextRunAt).getTime() - Date.now()) / 60_000); const unit = Math.abs(minutes) >= 1440 ? 'day' : Math.abs(minutes) >= 60 ? 'hour' : 'minute'; const value = unit === 'day' ? Math.round(minutes / 1440) : unit === 'hour' ? Math.round(minutes / 60) : minutes; const relative = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'}).format(value, unit);
  return <span className={`incld-next-run ${className}`.trim()}>{format === 'absolute' ? absolute : format === 'relative' ? relative : <><strong>{relative}</strong><small>{absolute}</small></>}</span>;
}
