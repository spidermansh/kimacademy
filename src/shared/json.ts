// Helpers ép kiểu cho các cột jsonb (Prisma trả về giá trị đã parse). Vẫn chấp
// nhận chuỗi JSON cũ để tương thích ngược an toàn trong giai đoạn chuyển đổi.

/** Ép giá trị (mảng sẵn / chuỗi JSON / null) về mảng. */
export function toArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Ép giá trị về object JSON (loại trừ mảng/null). Trả `any` để gán được vào DTO cụ thể. */
export function toObject(value: unknown): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Giữ tương thích với DTO cũ kiểu string: trả về chuỗi JSON từ giá trị bất kỳ. */
export function toJsonString(value: unknown): string {
  if (value == null) return '[]';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}

/** Chuẩn hóa giá trị để LƯU vào cột jsonb: nếu là chuỗi JSON thì parse, ngược lại giữ nguyên. */
export function coerceJson(value: unknown): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
