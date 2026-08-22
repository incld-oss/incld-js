export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  /** Available on the authenticated server client. Browser requests ignore custom headers. */
  headers?: Record<string, string>;
}

export interface PageMeta { nextCursor: string | null; hasMore: boolean }
export interface Page<T> { data: T[]; meta: PageMeta }
export interface PageParams { limit?: number; cursor?: string }

export interface ActionSummary { identifier: string; displayName: string }
export interface Action extends ActionSummary {
  id: string;
  description?: string;
  payloadSchema: Record<string, unknown>;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export interface DefineActionInput {
  identifier: string;
  displayName: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

export interface RecurrenceOnce {
  frequency: 'once'; date: string; localTime: string; timezone: string;
}
export interface RecurrenceDaily {
  frequency: 'daily'; interval: number; localTime: string; timezone: string;
  startsAt?: string; ends?: EndCondition;
}
export interface RecurrenceWeekly {
  frequency: 'weekly'; interval: number; weekdays: Weekday[]; localTime: string;
  timezone: string; startsAt?: string; ends?: EndCondition;
}
export interface RecurrenceMonthly {
  frequency: 'monthly'; interval: number;
  monthlyMode: 'day_of_month' | 'first_monday' | 'last_friday' | 'last_day';
  dayOfMonth?: number; localTime: string; timezone: string; startsAt?: string;
  ends?: EndCondition;
}
export type Frequency = 'once' | 'daily' | 'weekly' | 'monthly';
export type MonthlyMode = 'day_of_month' | 'first_monday' | 'last_friday' | 'last_day';
export type Recurrence = RecurrenceOnce | RecurrenceDaily | RecurrenceWeekly | RecurrenceMonthly;
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export interface EndConditionNever { type: 'never' }
export interface EndConditionOnDate { type: 'on_date'; date: string }
export interface EndConditionAfterOccurrences { type: 'after_occurrences'; count: number }
export type EndCondition = EndConditionNever | EndConditionOnDate | EndConditionAfterOccurrences;

export interface Schedule {
  id: string;
  status: 'active' | 'paused' | 'deleted';
  externalUserId?: string;
  externalOrganizationId?: string;
  action: ActionSummary;
  payload: Record<string, unknown>;
  recurrence: Recurrence;
  timezone: string;
  startAt?: string;
  endCondition?: EndCondition;
  overlapPolicy: 'allow' | 'skip';
  misfirePolicy: 'skip' | 'run_once' | 'catch_up';
  nextRunAt: string | null;
  lastRunAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface ScheduleInput {
  action: string;
  externalUserId?: string;
  externalOrganizationId?: string;
  payload?: Record<string, unknown>;
  recurrence: Recurrence;
  timezone: string;
  overlapPolicy?: 'allow' | 'skip';
  misfirePolicy?: 'skip' | 'run_once' | 'catch_up';
}
export type UpdateScheduleInput = Partial<ScheduleInput>;
export interface ListSchedulesParams extends PageParams {
  externalUserId?: string; action?: string; status?: Schedule['status'];
}
export interface SchedulePreviewInput { recurrence: Recurrence; count?: number; from?: string }
export interface SchedulePreviewOccurrence {
  utc: string; local: string; date: string; time: string; timezone: string;
  timezoneAbbreviation: string; label: string;
}
export interface SchedulePreview { summary: string; occurrences: SchedulePreviewOccurrence[] }

export interface Run {
  id: string;
  scheduleId: string;
  externalUserId?: string;
  action: ActionSummary;
  status: 'scheduled' | 'delivering' | 'delivered' | 'retrying' | 'succeeded' | 'failed' | 'cancelled' | 'skipped';
  nominalAt: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  attemptCount: number;
  payloadSnapshot: Record<string, unknown>;
  error: string | null;
  responseCode?: number;
  scheduleRevision: number;
  createdAt: string;
  updatedAt: string;
}
export interface ListRunsParams extends PageParams {
  externalUserId?: string; status?: Run['status']; action?: string;
  scheduleId?: string; search?: string;
}

export interface CreateSessionInput { claims: Record<string, unknown> }
export interface SessionToken { token: string }
export interface WebhookEvent {
  id: string; type: string; data: Record<string, unknown>; created_at: string;
}
export interface WebhookOptions {
  secret: string;
  actions: Record<string, (event: WebhookEvent) => Promise<void>>;
}

/** @deprecated Use ScheduleInput. */
export type CreateScheduleParams = ScheduleInput;
/** @deprecated Use UpdateScheduleInput. */
export type UpdateScheduleParams = UpdateScheduleInput;
/** @deprecated Use SchedulePreviewInput. */
export type SchedulePreviewParams = SchedulePreviewInput;
/** @deprecated Use DefineActionInput. */
export type DefineActionParams = DefineActionInput;
/** @deprecated Use CreateSessionInput. */
export type CreateSessionParams = CreateSessionInput;
