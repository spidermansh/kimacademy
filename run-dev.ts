import { spawn } from 'child_process';

console.log('🚀 Đang khởi động hệ thống quản lý Kim Academy v3...');
console.log('👉 Frontend (Vite) sẽ chạy ở: http://localhost:3025');
console.log('👉 Backend (Express) sẽ chạy ở: http://localhost:3021');
console.log('------------------------------------------------------------');

// Khởi chạy Vite Client
const vite = spawn('npx', ['vite', '--port=3025', '--host=0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
});

// Khởi chạy Express Server
const server = spawn('npx', ['tsx', 'src/api/server.ts'], {
  stdio: 'inherit',
  shell: true,
});

// Dọn dẹp các tiến trình khi thoát
const cleanUp = () => {
  console.log('\n🛑 Đang dừng toàn bộ các tiến trình v3...');
  vite.kill('SIGINT');
  server.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
