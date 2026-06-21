import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, '../src/api/routes');

// Define replacements for each file
// Format: { file, replacements: [ [search, replace] ] }
const fixes: { file: string; replacements: [string, string][] }[] = [
  {
    file: 'users.ts',
    replacements: [
      ["usersRouter.get('/',", "usersRouter.get('/users',"],
      ["usersRouter.post('/',", "usersRouter.post('/users',"],
      ["usersRouter.put('/:id',", "usersRouter.put('/users/:id',"],
      ["usersRouter.delete('/:id',", "usersRouter.delete('/users/:id',"],
    ]
  },
  {
    file: 'students.ts',
    replacements: [
      ["studentsRouter.get('/',", "studentsRouter.get('/students',"],
      ["studentsRouter.post('/',", "studentsRouter.post('/students',"],
      ["studentsRouter.put('/:id',", "studentsRouter.put('/students/:id',"],
      ["studentsRouter.delete('/:id',", "studentsRouter.delete('/students/:id',"],
      ["studentsRouter.post('/batch',", "studentsRouter.post('/students/batch',"],
      ["studentsRouter.post('/check-duplicate',", "studentsRouter.post('/students/check-duplicate',"],
    ]
  },
  {
    file: 'classes.ts',
    replacements: [] // will check below
  },
  {
    file: 'attendance.ts',
    replacements: [] // will check below
  },
  {
    file: 'enrollments.ts',
    replacements: [] // will check below
  },
  {
    file: 'notifications.ts',
    replacements: [
      ["notificationsRouter.get('/',", "notificationsRouter.get('/notifications',"],
      ["notificationsRouter.patch('/:id/read',", "notificationsRouter.patch('/notifications/:id/read',"],
      ["notificationsRouter.patch('/read-all',", "notificationsRouter.patch('/notifications/read-all',"],
      ["notificationsRouter.delete('/:id',", "notificationsRouter.delete('/notifications/:id',"],
      ["notificationsRouter.post('/generate',", "notificationsRouter.post('/notifications/generate',"],
    ]
  },
  {
    file: 'settings.ts',
    replacements: [
      // '/' needs to become '/settings'
      ["settingsRouter.get('/',", "settingsRouter.get('/settings',"],
      ["settingsRouter.put('/',", "settingsRouter.put('/settings',"],
    ]
  },
  {
    file: 'reports.ts',
    replacements: [
      ["reportsRouter.get('/catalog',", "reportsRouter.get('/reports/catalog',"],
      ["reportsRouter.post('/run',", "reportsRouter.post('/reports/run',"],
    ]
  },
  {
    file: 'inventory.ts',
    replacements: [
      ["inventoryRouter.get('/categories',", "inventoryRouter.get('/inventory/categories',"],
      ["inventoryRouter.post('/categories',", "inventoryRouter.post('/inventory/categories',"],
      ["inventoryRouter.get('/suppliers',", "inventoryRouter.get('/inventory/suppliers',"],
      ["inventoryRouter.post('/suppliers',", "inventoryRouter.post('/inventory/suppliers',"],
      ["inventoryRouter.get('/locations',", "inventoryRouter.get('/inventory/locations',"],
      ["inventoryRouter.post('/locations',", "inventoryRouter.post('/inventory/locations',"],
      ["inventoryRouter.get('/items',", "inventoryRouter.get('/inventory/items',"],
      ["inventoryRouter.post('/items',", "inventoryRouter.post('/inventory/items',"],
      ["inventoryRouter.get('/stocks',", "inventoryRouter.get('/inventory/stocks',"],
      ["inventoryRouter.get('/movements',", "inventoryRouter.get('/inventory/movements',"],
      ["inventoryRouter.post('/movements',", "inventoryRouter.post('/inventory/movements',"],
    ]
  },
  {
    file: 'payroll.ts',
    replacements: [
      // Staff CRUD routes (was mounted at /api/staff, using '/')
      ["payrollRouter.get('/',", "payrollRouter.get('/staff',"],
      ["payrollRouter.post('/',", "payrollRouter.post('/staff',"],
      ["payrollRouter.put('/:id',", "payrollRouter.put('/staff/:id',"],
      ["payrollRouter.delete('/:id',", "payrollRouter.delete('/staff/:id',"],
    ]
  },
  {
    file: 'finance.ts',
    replacements: [
      // Expense routes (was mounted at /api/expenses, using '/')
      // Need to check the expense routes '/' and '/:id'
      // But first, let's handle this carefully since finance has both '/transactions' and '/' routes
    ]
  }
];

let totalChanges = 0;

for (const { file, replacements } of fixes) {
  if (replacements.length === 0) continue;
  
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  for (const [search, replace] of replacements) {
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
