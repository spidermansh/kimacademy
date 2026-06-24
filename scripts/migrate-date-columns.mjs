// One-off: đổi các cột ngày kiểu String trong schema.prisma sang DateTime.
import fs from 'fs';

const file = 'prisma/schema.prisma';
const dateOnly = new Set([
  'startDate', 'endDate', 'date', 'paymentDate', 'movementDate', 'birthDate',
  'enrollDate', 'registrationDate', 'testScheduleDate', 'testDate', 'dateOfBirth',
  'effectiveFrom', 'effectiveTo',
]);
const timestamp = new Set(['completedAt', 'convertedAt']);

const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
let changed = 0;
const out = lines.map((line) => {
  const m = line.match(/^(\s+)(\w+)(\s+)String(\??)(\s*)(.*)$/);
  if (!m) return line;
  const [, indent, name, sp, opt, , rest] = m;
  if (name === 'month') return line; // YYYY-MM, giữ String
  if (dateOnly.has(name)) {
    changed++;
    return `${indent}${name}${sp}DateTime${opt} @db.Date${rest ? ' ' + rest : ''}`;
  }
  if (timestamp.has(name)) {
    changed++;
    return `${indent}${name}${sp}DateTime${opt}${rest ? ' ' + rest : ''}`;
  }
  return line;
});

fs.writeFileSync(file, out.join(eol));
console.log('Đổi', changed, 'cột ngày sang DateTime.');
