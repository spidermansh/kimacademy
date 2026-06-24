import { spawn } from 'child_process';

const frontendPort = process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || '3025';
const backendPort = process.env.PORT || '3021';
const apiProxyTarget = process.env.API_PROXY_TARGET || `http://localhost:${backendPort}`;

console.log('Starting Kim Academy v3 local dev...');
console.log(`Frontend (Vite): http://localhost:${frontendPort}`);
console.log(`Backend (Express): http://localhost:${backendPort}`);
console.log(`API proxy target: ${apiProxyTarget}`);
console.log('------------------------------------------------------------');

const vite = spawn('npx', ['vite', `--port=${frontendPort}`, '--host=0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_DEV_PORT: frontendPort,
    API_PROXY_TARGET: apiProxyTarget,
  },
});

const server = spawn('npx', ['tsx', 'src/api/server.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: backendPort,
  },
});

const cleanUp = () => {
  console.log('\nStopping Kim Academy v3 local dev...');
  vite.kill('SIGINT');
  server.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
