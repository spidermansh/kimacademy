import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, '../src/api/routes');

const files = fs.readdirSync(routesDir);

for (const file of files) {
  if (file.endsWith('.ts')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const updated = content.replace(/from\s+['"]\.\.\/server['"]/g, "from '../middleware/auth'");
    if (content !== updated) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`Updated auth imports in ${file}`);
    }
  }
}
console.log('All route imports fixed!');
