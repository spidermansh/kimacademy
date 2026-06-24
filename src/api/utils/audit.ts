import { Request } from 'express';

interface AuditInput {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  oldValue?: any;
  newValue?: any;
}

/**
 * Ghi AuditLog với CẢ tên hiển thị lẫn userId (truy vết chắc chắn, không vỡ khi
 * người dùng đổi tên). `client` có thể là prisma hoặc transaction client.
 */
export async function writeAudit(client: any, req: Request | undefined, data: AuditInput) {
  await client.auditLog.create({
    data: {
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? undefined,
      details: data.details ?? undefined,
      oldValue: data.oldValue ?? undefined,
      newValue: data.newValue ?? undefined,
      user: req?.user?.name || req?.user?.username || 'system',
      userId: req?.user?.userId || null,
    },
  });
}
