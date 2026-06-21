import http from 'http';

function makeRequest(options: http.RequestOptions, body?: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== API Route Testing ===\n');

  // 1. Login to get token
  const loginRes = await makeRequest(
    { hostname: 'localhost', port: 3021, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ username: 'admin', password: 'admin123' })
  );
  console.log(`1. POST /api/auth/login => ${loginRes.status}`);
  
  let token = '';
  try {
    const loginData = JSON.parse(loginRes.data);
    token = loginData.token;
    console.log(`   Token: ${token ? 'OK (' + token.slice(0, 20) + '...)' : 'MISSING!'}`);
  } catch (e) {
    console.log(`   Error: ${loginRes.data.slice(0, 100)}`);
    return;
  }

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Test all major endpoints
  const tests = [
    { label: '2. GET /api/students', method: 'GET', path: '/api/students' },
    { label: '3. GET /api/classes', method: 'GET', path: '/api/classes' },
    { label: '4. GET /api/attendance', method: 'GET', path: '/api/attendance' },
    { label: '5. GET /api/enrollments', method: 'GET', path: '/api/enrollments' },
    { label: '6. GET /api/transactions', method: 'GET', path: '/api/transactions' },
    { label: '7. GET /api/expenses', method: 'GET', path: '/api/expenses' },
    { label: '8. GET /api/staff', method: 'GET', path: '/api/staff' },
    { label: '9. GET /api/teaching-logs', method: 'GET', path: '/api/teaching-logs' },
    { label: '10. GET /api/salary-advances', method: 'GET', path: '/api/salary-advances' },
    { label: '11. GET /api/monthly-salaries', method: 'GET', path: '/api/monthly-salaries' },
    { label: '12. GET /api/settings', method: 'GET', path: '/api/settings' },
    { label: '13. GET /api/system-parameters', method: 'GET', path: '/api/system-parameters' },
    { label: '14. GET /api/reports/catalog', method: 'GET', path: '/api/reports/catalog' },
    { label: '15. GET /api/admission-leads', method: 'GET', path: '/api/admission-leads' },
    { label: '16. GET /api/admission-summary', method: 'GET', path: '/api/admission-summary' },
    { label: '17. GET /api/inventory/categories', method: 'GET', path: '/api/inventory/categories' },
    { label: '18. GET /api/inventory/items', method: 'GET', path: '/api/inventory/items' },
    { label: '19. GET /api/notifications', method: 'GET', path: '/api/notifications' },
    { label: '20. GET /api/users', method: 'GET', path: '/api/users' },
    { label: '21. GET /api/daily-closes', method: 'GET', path: '/api/daily-closes' },
    { label: '22. GET /api/audit-logs', method: 'GET', path: '/api/audit-logs' },
    { label: '23. GET /api/backup', method: 'GET', path: '/api/backup' },
  ];

  for (const t of tests) {
    try {
      const res = await makeRequest(
        { hostname: 'localhost', port: 3021, path: t.path, method: t.method, headers: authHeaders }
      );
      const isJSON = res.data.startsWith('[') || res.data.startsWith('{');
      const status = res.status === 200 ? '✅' : `❌ (${res.status})`;
      const extra = isJSON ? (Array.isArray(JSON.parse(res.data)) ? `array[${JSON.parse(res.data).length}]` : 'object') : 'NOT JSON!';
      console.log(`${t.label} => ${status} ${extra}`);
    } catch (err: any) {
      console.log(`${t.label} => ❌ ERROR: ${err.message}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
