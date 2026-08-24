/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    // The API is served from a different port in development, and the browser is told about
    // exactly one origin. Proxying rather than adding CORS to the API is deliberate: CORS is a
    // production concern about who may call the API from where, and inventing that policy now
    // to satisfy a dev-server port would be answering a question nobody has asked yet.
    proxy: {
      '/api': {
        // Overridden by the Playwright harness, which runs its own API on a neighbouring port
        // against a throwaway database, so a test run cannot touch the games you actually logged.
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5201',

        // Host stays as the browser sent it, and that is load-bearing rather than a default
        // left alone. ASP.NET builds the OAuth redirect URI out of the incoming Host, so
        // rewriting it here would send the provider back to the API's own port — an origin
        // where the correlation cookie set on this one is not sent, and where the session
        // cookie would land somewhere the app cannot read. The whole sign-in has to stay on
        // one origin, which is the same property the cookie depends on in production.
        changeOrigin: false,
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright's specs match Vitest's default pattern and would otherwise be collected here,
    // where there is no browser to run them in.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
