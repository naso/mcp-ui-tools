import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** The game as one HTML file, which the server sends to the host. */
export default defineConfig({
  root: 'view',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    // Browsers with `light-dark()`, so it is kept rather than emulated.
    cssTarget: ['chrome123', 'safari17.5', 'firefox120'],
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'view/orbit.html'),
    },
  },
  plugins: [viteSingleFile()],
});
