export type TabKey =
  | "dashboard"
  | "products"
  | "locations"
  | "withdraw"
  | "add-product"
  | "add-location"
  | "admin";

export const WAREHOUSE_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "الرئيسية" },
  { key: "products", label: "المنتجات" },
  { key: "locations", label: "الأماكن" },
  { key: "withdraw", label: "سحب مخزون" },
  { key: "add-product", label: "إضافة منتج" },
  { key: "add-location", label: "إضافة مكان" },
  { key: "admin", label: "إدارة النظام" }
];

export const PAGE_SIZE = 2;

export type ScanTarget = "search" | "productBarcode" | "locationQr" | "withdrawBarcode" | null;
