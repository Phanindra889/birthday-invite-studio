import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { renderApi } from './server/render-api';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), renderApi({ root })],
  server: {
    port: 5173,
    watch: { ignored: ['**/out/**', '**/.cache/**'] },
  },
  preview: { port: 4173 },
});
