import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/components.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  external: ['react', 'next', '@incld/client', '@incld/client/next', '@incld/react', '@incld/react-schedules']
});
