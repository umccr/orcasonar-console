import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Where the dev server sends `/api`: OrcaSonar dev under `make start`, whose start.sh sets ORCASONAR_API, or the
 * in-memory API that `make local-api` runs from umccr/orcasonar.
 */
const apiTarget = process.env.ORCASONAR_API ?? 'http://127.0.0.1:8787';

/** The dev pool's localhost Cognito client sends readers back to http://localhost:3000, so signing in needs 3000. */
const port = Number(process.env.PORT ?? 3000);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served at portal.<stage>.umccr.org/orcasonar/: the portal pipeline syncs build/ to that prefix.
  base: '/orcasonar/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The API the dev server proxies to, for the sidebar to show. A build has none.
  define: { __DEV_API_TARGET__: JSON.stringify(command === 'serve' ? apiTarget : '') },
  server: {
    port,
    strictPort: true,
    // Same-origin for the browser, so OrcaSonar's CORS, which allows only the deployed hosts, is never asked.
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: { port },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    // Maps for error reports, without serving them.
    sourcemap: 'hidden',
    target: 'es2023',
    rolldownOptions: {
      output: {
        // Libraries in their own chunks, which stay cached across releases of the console's own code.
        codeSplitting: {
          groups: [
            {
              name: 'amplify',
              test: /node_modules[\\/](@aws-amplify|aws-amplify|@aws-crypto|@smithy)[\\/]/,
            },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/ },
            { name: 'base-ui', test: /node_modules[\\/]@base-ui[\\/]/ },
            { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
            {
              name: 'markdown',
              test: /node_modules[\\/](react-markdown|remark-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unist-[^\\/]+|unified|vfile[^\\/]*)[\\/]/,
            },
          ],
        },
      },
      onLog(level, log, handler) {
        // ReUI's data grid opts out of the React Compiler with "use no memo", which the console doesn't use.
        if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('use no memo')) {
          return;
        }
        handler(level, log);
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
}));
