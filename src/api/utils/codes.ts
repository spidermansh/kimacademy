type CodedModel = {
  findMany(args: any): Promise<Array<{ code: string }>>;
  findUnique(args: any): Promise<unknown>;
};

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function parseSequence(code: string, prefix: string): number {
  const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

export async function generateUniqueCode(
  model: CodedModel,
  prefix: 'HV' | 'NV' | 'LH',
  providedCode?: unknown
): Promise<string> {
  const provided = normalizeCode(providedCode);
  if (provided) {
    const duplicate = await model.findUnique({ where: { code: provided } });
    if (duplicate) {
      throw new Error(`Mã ${provided} đã tồn tại`);
    }
    return provided;
  }

  const rows = await model.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 500,
  });
  const maxSequence = rows.reduce(
    (max, row) => Math.max(max, parseSequence(row.code, prefix)),
    0
  );

  for (let sequence = maxSequence + 1; sequence < maxSequence + 1000; sequence++) {
    const code = `${prefix}-${String(sequence).padStart(6, '0')}`;
    const exists = await model.findUnique({ where: { code } });
    if (!exists) return code;
  }

  throw new Error(`Không thể sinh mã ${prefix} duy nhất`);
}
