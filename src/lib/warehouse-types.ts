export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  criticalQty: number;
  /** ISO string أو null إن لم يُحدَّد تاريخ انتهاء */
  expiresAt: string | null;
  /** عدد الأيام قبل تاريخ الانتهاء لبدء التنبيه (مثل نافذة الحد الحرج للكمية) */
  expiryAlertDaysBefore: number;
};

export type Location = {
  id: string;
  name: string;
  qrCode: string;
};

export type StockEntry = {
  productId: string;
  locationId: string;
  qty: number;
};

export type ProductSummary = Product & {
  totalQty: number;
  status: "critical" | "ok";
  /** حالة الصلاحية عند وجود تاريخ انتهاء */
  expiryStatus: "none" | "soon" | "expired";
  daysToExpiry: number | null;
  locations: Array<{
    locationName: string;
    qty: number;
  }>;
};

export type WarehouseSnapshot = {
  products: Product[];
  locations: Location[];
  stock: StockEntry[];
};
