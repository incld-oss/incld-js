import type { IncldClient } from '@incld/client';
import type { Writable } from 'svelte/store';

export const INCLD_CONTEXT_KEY = Symbol('incld');

export interface IncldContextValue {
  api: IncldClient;
  updateKey: Writable<number>;
  config?: Record<string, string | number>;
}
