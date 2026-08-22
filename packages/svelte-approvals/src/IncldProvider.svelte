<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { IncldClient } from '@incld/client';
  import { INCLD_CONTEXT_KEY } from './context';

  export let apiBase: string = '/api/incld';
  export let config: Record<string, string | number> | undefined = undefined;

  const api = new IncldClient('client', { baseUrl: apiBase });
  const updateKey = writable(0);

  setContext(INCLD_CONTEXT_KEY, { api, updateKey, config });
</script>

<slot />
