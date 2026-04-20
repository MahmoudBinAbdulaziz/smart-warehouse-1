export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  criticalQty: number;
  expiresAt: string | null;
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
  expiryStatus: "none" | "soon" | "expired";
  daysToExpiry: number | null;
  locations: Array<{
    locationName: string;
    qty: number;
  }>;
};
