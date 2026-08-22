export type IncldFieldErrors = Record<string, string[]>;

export class IncldError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: IncldFieldErrors;
  readonly requestId?: string;

  constructor(
    message: string,
    options: {status: number; code: string; fields?: IncldFieldErrors; requestId?: string},
  ) {
    super(message);
    this.name = 'IncldError';
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields;
    this.requestId = options.requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends IncldError {
  constructor(message = 'Authentication failed', status = 401, code = 'unauthorized', requestId?: string) {
    super(message, {status, code, requestId});
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends IncldError {
  constructor(message = 'Operation forbidden', status = 403, code = 'forbidden', requestId?: string) {
    super(message, {status, code, requestId});
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends IncldError {
  constructor(message = 'Resource not found', status = 404, code = 'not_found', requestId?: string) {
    super(message, {status, code, requestId});
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends IncldError {
  constructor(
    message = 'The request could not be validated.',
    status = 422,
    code = 'validation_failed',
    fields: IncldFieldErrors = {},
    requestId?: string,
  ) {
    super(message, {status, code, fields, requestId});
    this.name = 'ValidationError';
  }
}

/** @deprecated Use IncldError. */
export const ScheduleKitError = IncldError;
