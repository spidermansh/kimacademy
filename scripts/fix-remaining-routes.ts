import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, '../src/api/routes');

const fixes: { file: string; replacements: [string, string][] }[] = [
  {
    file: 'classes.ts',
    replacements: [
      ["classesRouter.get('/',", "classesRouter.get('/classes',"],
      ["classesRouter.post('/',", "classesRouter.post('/classes',"],
      ["classesRouter.put('/:id',", "classesRouter.put('/classes/:id',"],
      ["classesRouter.delete('/:id',", "classesRouter.delete('/classes/:id',"],
    ]
  },
  {
    file: 'attendance.ts',
    replacements: [
      ["attendanceRouter.get('/',", "attendanceRouter.get('/attendance',"],
      ["attendanceRouter.post('/batch',", "attendanceRouter.post('/attendance/batch',"],
      ["attendanceRouter.delete('/:id',", "attendanceRouter.delete('/attendance/:id',"],
    ]
  },
  {
    file: 'enrollments.ts',
    replacements: [
      ["enrollmentsRouter.get('/',", "enrollmentsRouter.get('/enrollments',"],
      ["enrollmentsRouter.post('/',", "enrollmentsRouter.post('/enrollments',"],
      ["enrollmentsRouter.post('/transfer',", "enrollmentsRouter.post('/enrollments/transfer',"],
      ["enrollmentsRouter.post('/add-class',", "enrollmentsRouter.post('/enrollments/add-class',"],
      ["enrollmentsRouter.delete('/:id',", "enrollmentsRouter.delete('/enrollments/:id',"],
    ]
  },
  {
    file: 'finance.ts',
    replacements: [
      // The expense routes use '/' and '/:id' - need to become '/expenses' and '/expenses/:id'
      // But be careful - '/' for GET expenses is at line 306
      // We need to handle '/' for expense GET/POST separately from transactions
      // finance.ts expense section uses financeRouter.get('/', ...) and financeRouter.post('/', ...)
      // These should become '/expenses' and '/expenses/:id'  
      // Let's replace the GET '/' for expenses (line 306)
      ["financeRouter.get('/',", "financeRouter.get('/expenses',"],
      ["financeRouter.post('/',", "financeRouter.post('/expenses',"],
      ["financeRouter.put('/:id',", "financeRouter.put('/expenses/:id',"],
      ["financeRouter.delete('/:id',", "financeRouter.delete('/expenses/:id',"],
      // daily-closes and daily-close
      ["financeRouter.get('/daily-closes',", "financeRouter.get('/daily-closes',"], // already correct
      ["financeRouter.post('/daily-close',", "financeRouter.post('/daily-close',"], // already correct
    ]
  },
];

let totalChanges = 0;

for (const { file, replacements } of fixes) {
  if (replacements.length === 0) continue;
  
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  for (const [search, replace] of replacements) {
    if (search === replace) {
      console.log(`⏭️  ${file}: SKIP (same) "${search}"`);
      continue;
    }
    if (content.includes(search)) {
      content = content.replace(search, replace);
      changes++;
      console.log(`✅ ${file}: "${search}" → "${replace}"`);
    } else {
      console.log(`⚠️  ${file}: NOT FOUND "${search}"`);
    }
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalChanges += changes;
    console.log(`   📝 Saved ${file} with ${changes} changes\n`);
  }
}

console.log(`\n✨ Total changes: ${totalChanges}`);
