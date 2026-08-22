import React, {useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode} from 'react';
import type {IncldError} from '@incld/client';
import {useIncldLabel} from './provider.js';

export interface AsyncViewProps {
  loading?: ReactNode;
  empty?: ReactNode;
  error?: (error: IncldError, retry: () => void) => ReactNode;
}

export interface IncldSpinnerProps { label?: string; className?: string }
export function IncldSpinner({label, className = ''}: IncldSpinnerProps) {
  const resolvedLabel = label ?? useIncldLabel('loading', 'Loading');
  return <div className={`incld-state ${className}`.trim()} role="status"><span className="incld-spinner" aria-hidden="true" />{resolvedLabel}</div>;
}

export interface IncldEmptyStateProps { title: string; description?: string; className?: string }
export function IncldEmptyState({title, description, className = ''}: IncldEmptyStateProps) {
  return <div className={`incld-empty ${className}`.trim()}><strong>{title}</strong>{description && <span>{description}</span>}</div>;
}

export interface IncldErrorStateProps { error: IncldError; retry: () => void; className?: string }
export function IncldErrorState({error, retry, className = ''}: IncldErrorStateProps) {
  const title = useIncldLabel('errorTitle', 'Something went wrong');
  const retryLabel = useIncldLabel('retry', 'Try again');
  return (
    <div className={`incld-error ${className}`.trim()} role="alert">
      <div><strong>{title}</strong><span>{error.message}</span></div>
      <button type="button" className="incld-button incld-button-secondary" onClick={retry}>{retryLabel}</button>
    </div>
  );
}

export function errorMessagesFor(error: IncldError | undefined, ...fields: string[]) {
  if (!error?.fields) return [];
  return [...new Set(fields.flatMap(field => error.fields?.[field] ?? []))];
}

export interface IncldFieldErrorProps {
  error?: IncldError;
  fields: string | string[];
  id?: string;
  className?: string;
}

export function IncldFieldError({error, fields, id, className = ''}: IncldFieldErrorProps) {
  const messages = errorMessagesFor(error, ...(Array.isArray(fields) ? fields : [fields]));
  if (!messages.length) return null;
  return (
    <div id={id} className={`incld-field-error ${className}`.trim()} role="alert">
      {messages.map(message => <span key={message}>{message}</span>)}
    </div>
  );
}

export interface IncldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { busy?: boolean }
export function IncldButton({busy, children, disabled, ...props}: IncldButtonProps) {
  return (
    <button {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`incld-button ${props.className ?? ''}`.trim()}>
      {busy && <span className="incld-spinner" aria-hidden="true" />}{children}
    </button>
  );
}

export interface IncldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  backdropClassName?: string;
  closeLabel?: string;
  children: ReactNode;
}

export function IncldDialog({open, onOpenChange, title, description, className = '', backdropClassName = '', closeLabel, children}: IncldDialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `incld-dialog-title-${id}`;
  const descriptionId = `incld-dialog-description-${id}`;
  const resolvedCloseLabel = closeLabel ?? useIncldLabel('close', 'Close');
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => !element.hasAttribute('hidden'));
      if (!focusable.length) {
        event.preventDefault();
        panel.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div className={`incld-dialog-backdrop ${backdropClassName}`.trim()} role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div
        ref={panel}
        className={`incld-dialog ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <header><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" aria-label={resolvedCloseLabel} className="incld-icon-button" onClick={() => onOpenChange(false)}>×</button></header>
        {children}
      </div>
    </div>
  );
}
