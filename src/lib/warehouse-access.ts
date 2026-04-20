import type { SystemRole, WarehouseRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuthUserContext = {
  userId: string;
  email: string;
  systemRole: SystemRole;
};

export async function getMembership(userId: string, warehouseId: string) {
  return prisma.warehouseMember.findUnique({
    where: { userId_warehouseId: { userId, warehouseId } }
  });
}

export async function canAccessWarehouse(ctx: AuthUserContext, warehouseId: string): Promise<boolean> {
  if (ctx.systemRole === "ADMIN") return true;
  const m = await getMembership(ctx.userId, warehouseId);
  return Boolean(m);
}

export async function assertWarehouseAccess(ctx: AuthUserContext, warehouseId: string): Promise<{ role: WarehouseRole } | { isAdmin: true }> {
  if (!warehouseId?.trim()) {
    throw new Error("MISSING_WAREHOUSE");
  }
  if (ctx.systemRole === "ADMIN") {
    const exists = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!exists) throw new Error("WAREHOUSE_NOT_FOUND");
    return { isAdmin: true };
  }
  const m = await getMembership(ctx.userId, warehouseId);
  if (!m) throw new Error("FORBIDDEN_WAREHOUSE");
  return { role: m.role };
}

export function assertCanWrite(access: { role: WarehouseRole } | { isAdmin: true }) {
  if ("isAdmin" in access && access.isAdmin) return;
  if ("role" in access && access.role !== "VIEWER") return;
  throw new Error("READ_ONLY");
}
