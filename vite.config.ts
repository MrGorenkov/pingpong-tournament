/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// so assets must be requested from the "/<repo>/" sub-path. Change the repo
// name here, or override at build time:  BASE_PATH=/my-repo/ npm run build
const base = process.env.BASE_PATH ?? '/pingpong-tournament/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    // Keep the bundle honest: fail loudly if something bloats.
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
