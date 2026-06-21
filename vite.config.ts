import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:3021';
  const devPort = Number(process.env.VITE_DEV_PORT || 3025);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'stream': path.resolve(__dirname, './src/ui/shims/stream.ts'),
      },
    },
    optimizeDeps: {
      include: ['xlsx'],
    },
    server: {
      port: devPort,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
