// Helpers chuyển đổi ngày tại biên API. DB lưu DateTime/@db.Date nhưng hợp đồng
// API vẫn là chuỗi 'YYYY-MM-DD' (date-only) / ISO (timestamp). Luôn dùng UTC để
// tránh lệch ngày do múi giờ với cột date-only.

/** Date | null → 'YYYY-MM-DD' (UTC) | null. */
export function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Date | null → ISO timestamp | null. */
export function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.toISOString();
}

/** 'YYYY-MM-DD' (hoặc ISO) → Date (UTC) | null. Chuỗi rỗng/không hợp lệ → null. */
export function parseDate(s: string | Date | null | undefined): Date | null {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  // Date-only 'YYYY-MM-DD' → ép UTC midnight để không lệch ngày.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Khoảng [gte, lt) cho một tháng 'YYYY-MM' (lọc theo tháng). */
export function monthRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

/** Khoảng [gte, lt) cho đúng một ngày 'YYYY-MM-DD'. */
export function dayRange(day: string): { gte: Date; lt: Date } {
  const gte = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}
