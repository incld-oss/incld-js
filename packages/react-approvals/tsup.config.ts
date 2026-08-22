import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: 'src/index.ts'
  },
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  minify: true,
  onSuccess: 'cp src/styles.css dist/styles.css',
});
