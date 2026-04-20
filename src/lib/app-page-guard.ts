import type { AuthUserContext } from "@/lib/warehouse-access";
import { assertWarehouseAccess, getMembership } from "@/lib/warehouse-access";
import type { AppPageKey } from "@/lib/app-pages";
import { resolvePageAccess } from "@/lib/app-pages";
import { loadPageGrantsForUser } from "@/lib/page-grants-db";

export async function assertCanViewAppPage(ctx: AuthUserContext, warehouseId: string, pageKey: AppPageKey): Promise<void> {
  await assertWarehouseAccess(ctx, warehouseId);
  if (ctx.systemRole === "ADMIN") return;

  const grants = await loadPageGrantsForUser(ctx.userId);
  const m = await getMembership(ctx.userId, warehouseId);
  if (!m) throw new Error("FORBIDDEN_WAREHOUSE");
  const ok = resolvePageAccess({
    systemRole: "USER",
    membershipRole: m.role,
    warehouseId,
    pageKey,
    grants
  });
  if (!ok) throw new Error("PAGE_FORBIDDEN");
}
