/**
 * Cross-check Frontend API paths vs Backend Route paths
 * Verifies that every frontend API call has a matching backend handler
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Extract all frontend API paths from utils.ts
const utilsContent = fs.readFileSync(path.join(__dirname, '../src/shared/utils.ts'), 'utf-8');
const frontendPaths: { method: string; path: string; line: number }[] = [];

const lines = utilsContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Match request('/api/...') and request(`/api/...`)
  const match = lines[i].match(/request\(['`](\/api\/[^'`\$]+)['`]/);
  if (match) {
    // Determine method from previous lines
    let method = 'GET';
    for (let j = i; j >= Math.max(0, i - 5); j--) {
      const methodMatch = lines[j].match(/method:\s*'(GET|POST|PUT|DELETE|PATCH)'/);
      if (methodMatch) {
        method = methodMatch[1];
        break;
      }
    }
    frontendPaths.push({ method, path: match[1], line: i + 1 });
  }
}

// 2. Extract all backend route handlers from route files
const routesDir = path.join(__dirname, '../src/api/routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
const backendPaths: { method: string; path: string; file: string; line: number }[] = [];

for (const file of routeFiles) {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
  const routeLines = content.split('\n');
  
  for (let i = 0; i < routeLines.length; i++) {
    const match = routeLines[i].match(/Router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/i);
    if (match) {
      backendPaths.push({
        method: match[1].toUpperCase(),
        path: '/api' + match[2],
        file,
        line: i + 1
      });
    }
    
    // Also match named router calls like studentsRouter.get(...)
    const namedMatch = routeLines[i].match(/\w+Router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
    if (namedMatch) {
      backendPaths.push({
        method: namedMatch[1].toUpperCase(),
        path: '/api' + namedMatch[2],
        file,
        line: i + 1
      });
    }
  }
}

// Deduplicate backend paths
const uniqueBackend = new Map<string, typeof backendPaths[0]>();
for (const bp of backendPaths) {
  const key = `${bp.method} ${bp.path}`;
  if (!uniqueBackend.has(key)) {
    uniqueBackend.set(key, bp);
  }
}

// 3. Cross-check
console.log('═══════════════════════════════════════════');
console.log('FRONTEND → BACKEND ROUTE MATCHING');
console.log('═══════════════════════════════════════════\n');

let mismatches = 0;

for (const fp of frontendPaths) {
  // Normalize path (replace :id with * for matching)
  const normalizedFE = fp.path.replace(/\/[a-f0-9-]+\//g, '/:id/');
  
  // Find matching backend route
  const match = [...uniqueBackend.values()].find(bp => {
    // Direct match
    if (bp.method === fp.method && bp.path === fp.path) return true;
    // Parameter match (frontend uses literal ids, backend uses :id)
    const bpPattern = bp.path.replace(/:(\w+)/g, '[^/]+');
    const regex = new RegExp(`^${bpPattern}$`);
    return bp.method === fp.method && regex.test(fp.path);
  });

  if (match) {
    console.log(`✅ ${fp.method.padEnd(7)} ${fp.path.padEnd(50)} → ${match.file}:${match.line}`);
  } else {
    console.log(`❌ ${fp.method.padEnd(7)} ${fp.path.padEnd(50)} → NOT FOUND IN BACKEND`);
    mismatches++;
  }
}

console.log(`\n═══════════════════════════════════════════`);
console.log(`BACKEND ROUTES NOT CALLED FROM FRONTEND`);
console.log(`═══════════════════════════════════════════\n`);

let unusedCount = 0;
for (const [key, bp] of uniqueBackend) {
  const normalizedBP = bp.path;
  const match = frontendPaths.find(fp => {
    if (fp.method === bp.method && fp.path === normalizedBP) return true;
    // Check parameterized paths
    const bpPattern = normalizedBP.replace(/:(\w+)/g, '[^/]+');
    const regex = new RegExp(`^${bpPattern}$`);
    return fp.method === bp.method && regex.test(fp.path);
  });

  if (!match) {
    // Check if it's a parameterized route that has a matching pattern
    const hasParamMatch = frontendPaths.some(fp => {
      if (fp.method !== bp.method) return false;
      // Frontend uses /api/students/${id} which becomes /api/students/xxx
      // Backend uses /api/students/:id
      const fePattern = fp.path.replace(/\$\{[^}]+\}/g, ':param');
      return fePattern === normalizedBP;
    });
    
    if (!hasParamMatch) {
      console.log(`⚠️  ${bp.method.padEnd(7)} ${normalizedBP.padEnd(50)} (${bp.file}:${bp.line})`);
      unusedCount++;
    }
  }
}

console.log(`\n═══════════════════════════════════════════`);
console.log(`SUMMARY`);
console.log(`═══════════════════════════════════════════`);
console.log(`Frontend API calls: ${frontendPaths.length}`);
console.log(`Backend routes: ${uniqueBackend.size}`);
console.log(`Missing backend: ${mismatches}`);
console.log(`Unused backend: ${unusedCount}`);
