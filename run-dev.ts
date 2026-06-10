import { spawn } from 'child_process';

console.log('🚀 Đang khởi động hệ thống quản lý thu tiền Kim Academy...');
console.log('👉 Frontend (Vite) sẽ chạy ở: http://localhost:3000');
console.log('👉 Backend (Express) sẽ chạy ở: http://localhost:3001');
console.log('------------------------------------------------------------');

// Start Vite Client
const vite = spawn('npx', ['vite', '--port=3000', '--host=0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
});

// Start Express Server
const server = spawn('npx', ['tsx', 'server.ts'], {
  stdio: 'inherit',
  shell: true,
});

// Clean up processes on exit
const cleanUp = () => {
  console.log('\n🛑 Đang dừng toàn bộ các tiến trình...');
  vite.kill('SIGINT');
  server.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
