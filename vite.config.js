import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server serves the React app and proxies API calls to the Express backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
