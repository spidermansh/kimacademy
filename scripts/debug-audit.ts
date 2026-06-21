import http from 'http';

async function main() {
  // Login
  const loginRes = await new Promise<string>((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: 3021, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); }
    );
    req.write(JSON.stringify({ username: 'admin', password: 'admin123' }));
    req.end();
  });
  const token = JSON.parse(loginRes).token;

  // Test audit-logs
  const res = await new Promise<{status: number, data: string}>((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: 3021, path: '/api/audit-logs', method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({status: res.statusCode || 0, data: d})); }
    );
    req.end();
  });
  
  console.log('Status:', res.status);
  console.log('Data:', res.data);
}
main().catch(console.error);
