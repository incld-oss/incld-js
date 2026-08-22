import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/webhooks/express.ts',
    'src/webhooks/next.ts',
    'src/webhooks/sveltekit.ts',
    'src/webhooks/nuxt.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
