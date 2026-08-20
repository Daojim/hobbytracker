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
        target: 'http://localhost:5201',
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
