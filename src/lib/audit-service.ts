import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logWarehouseAudit(params: {
  warehouseId: string;
  userId: string;
  action: string;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        warehouseId: params.warehouseId,
        userId: params.userId,
        action: params.action,
        details: params.details === undefined ? undefined : params.details
      }
    });
  } catch (e) {
    console.error("audit_log_failed", e);
  }
}
