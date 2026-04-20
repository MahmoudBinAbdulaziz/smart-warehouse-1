import type { SystemRole, WarehouseRole } from "@prisma/client";

export const PAGE_KEYS = [
  "dashboard",
  "products",
  "locations",
  "withdraw",
  "add-product",
  "add-location",
  "statistics",
  "audit"
] as const;

export type AppPageKey = (typeof PAGE_KEYS)[number];

export const PAGE_LABEL_AR: Record<AppPageKey, string> = {
  dashboard: "الرئيسية",
  products: "المنتجات",
  locations: "الأماكن",
  withdraw: "سحب مخزون",
  "add-product": "إضافة منتج",
  "add-location": "إضافة مكان",
  statistics: "الإحصائيات",
  audit: "سجل العمليات"
};

export type PageGrantRow = { warehouseId: string; pageKey: string; allowed: boolean };

export function defaultPageAllowed(role: WarehouseRole, pageKey: AppPageKey): boolean {
  const viewer = role === "VIEWER";
  switch (pageKey) {
    case "dashboard":
    case "products":
    case "locations":
      return true;
    case "withdraw":
    case "add-product":
    case "add-location":
      return !viewer;
    case "statistics":
    case "audit":
      return false;
    default:
      return false;
  }
}

export function resolvePageAccess(params: {
  systemRole: SystemRole;
  membershipRole: WarehouseRole | null;
  warehouseId: string;
  pageKey: AppPageKey;
  grants: PageGrantRow[];
}): boolean {
  const { systemRole, membershipRole, warehouseId, pageKey, grants } = params;
  if (systemRole === "ADMIN") return true;
  if (!membershipRole) return false;

  const g = grants.find((x) => x.warehouseId === warehouseId && x.pageKey === pageKey);
  if (g !== undefined) return g.allowed;

  return defaultPageAllowed(membershipRole, pageKey);
}
