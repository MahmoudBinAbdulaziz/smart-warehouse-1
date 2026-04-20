import { prisma } from "@/lib/prisma";
import type { PageGrantRow } from "@/lib/app-pages";

export async function loadPageGrantsForUser(userId: string): Promise<PageGrantRow[]> {
  const rows = await prisma.warehousePageGrant.findMany({
    where: { userId },
    select: { warehouseId: true, pageKey: true, allowed: true }
  });
  return rows;
}
