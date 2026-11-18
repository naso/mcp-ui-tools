import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Browsers with `light-dark()`, so it is kept rather than emulated.
    cssTarget: ['chrome123', 'safari17.5', 'firefox120'],
  },
  resolve: {
    alias: {
      // The source, so `@fabiocv/component-code/html` resolves too.
      '@fabiocv/component-code': path.resolve(
        import.meta.dirname,
        '../packages/component-code/src',
      ),
    },
  },
  // The gallery's API, from the Worker that `pnpm --filter site api` runs.
  server: { proxy: { '/api': 'http://localhost:8787' } },
  plugins: [react()],
});
