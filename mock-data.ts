import type { Location, Product, ProductSummary, StockEntry } from "./lib/warehouse-types";

export const products: Product[] = [
  { id: "p1", name: "Laptop Dell 14", sku: "SKU-1001", barcode: "8901001001", criticalQty: 10 },
  { id: "p2", name: "Mouse Logitech M90", sku: "SKU-1002", barcode: "8901001002", criticalQty: 20 },
  { id: "p3", name: "Keyboard K120", sku: "SKU-1003", barcode: "8901001003", criticalQty: 12 }
];

export const locations: Location[] = [
  { id: "l1", name: "A-01-R1", qrCode: "LOC-A-01-R1" },
  { id: "l2", name: "A-01-R2", qrCode: "LOC-A-01-R2" },
  { id: "l3", name: "B-03-R1", qrCode: "LOC-B-03-R1" }
];

export const stock: StockEntry[] = [
  { productId: "p1", locationId: "l1", qty: 4 },
  { productId: "p1", locationId: "l2", qty: 9 },
  { productId: "p2", locationId: "l1", qty: 8 },
  { productId: "p2", locationId: "l3", qty: 19 },
  { productId: "p3", locationId: "l2", qty: 5 }
];

function toEnglishDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeBarcode(value: string): string {
  const englishDigits = toEnglishDigits(value);
  return englishDigits.replace(/\D/g, "");
}

function buildBarcodeVariants(value: string): string[] {
  const normalized = normalizeBarcode(value);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);

  // Common compatibility: scanners may return UPC-A (12 digits) or EAN-13 (13 digits)
  // for the same product. We map both formats to improve matching reliability.
  if (normalized.length === 12) variants.add(`0${normalized}`);
  if (normalized.length === 13 && normalized.startsWith("0")) variants.add(normalized.slice(1));

  return [...variants];
}

export function buildProductSummary(): ProductSummary[] {
  return products.map((product) => {
    const entries = stock.filter((entry) => entry.productId === product.id);
    const totalQty = entries.reduce((sum, entry) => sum + entry.qty, 0);
    return {
      ...product,
      totalQty,
      status: totalQty <= product.criticalQty ? "critical" : "ok",
      locations: entries.map((entry) => ({
        locationName: locations.find((loc) => loc.id === entry.locationId)?.name ?? "Unknown",
        qty: entry.qty
      }))
    };
  });
}

export function searchProducts(term: string): ProductSummary[] {
  const q = term.trim().toLowerCase();
  if (!q) return buildProductSummary();
  const barcodeCandidates = new Set(buildBarcodeVariants(q));

  return buildProductSummary().filter(
    (p) =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      buildBarcodeVariants(p.barcode).some((barcode) => barcodeCandidates.has(barcode))
  );
}
