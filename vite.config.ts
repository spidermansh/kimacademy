import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
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
      port: 3025,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3021',
          changeOrigin: true,
        },
      },
    },
  };
});
