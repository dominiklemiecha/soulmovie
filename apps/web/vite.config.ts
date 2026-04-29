import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
  },
});
