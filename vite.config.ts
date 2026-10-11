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
  // `npm start` (used on Render): listen on all interfaces and accept the public hostname.
  preview: { port: Number(process.env.PORT) || 4173, host: true, allowedHosts: true },
});
