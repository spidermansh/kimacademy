import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REVENUE_CATEGORY_TUITION_OFFLINE } from '../../src/shared/constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../../src');

// Các chuỗi byte đặc trưng của mojibake (UTF-8 bị diễn giải nhầm là cp1252 rồi
// mã hóa lại). Đây là tổ hợp KHÔNG hợp lệ trong tiếng Việt đúng chuẩn, ví dụ
// "Ã©", "Æ°", "á»", "Ä‘", "â€" ... Khác với các chữ Việt đơn lẻ như Â, Ã, Đ.
const MOJIBAKE = /Ã[-¿©¨ª«¬]|á»|áº|Ä‘|Æ°|â€|Ã¡|Ã¢|Ã£|Ã­|Ã³|Ãº/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('Source encoding integrity', () => {
  it('không còn file nguồn nào chứa chuỗi mojibake', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach((line, i) => {
        if (MOJIBAKE.test(line)) {
          offenders.push(`${path.relative(SRC_DIR, file)}:${i + 1}  ${line.trim().slice(0, 80)}`);
        }
      });
    }
    expect(offenders, `Phát hiện mojibake:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('hằng số phân loại học phí đúng chuẩn UTF-8', () => {
    expect(REVENUE_CATEGORY_TUITION_OFFLINE).toBe('Học phí offline');
  });
});
