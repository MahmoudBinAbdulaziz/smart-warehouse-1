import { buildBarcodeVariants } from "@/lib/barcode";
import type { Product } from "@/lib/warehouse-types";

export function findProductFromQuery(products: Product[], query: string): Product | null {
  const raw = query.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const variants = new Set(buildBarcodeVariants(raw));
  for (const p of products) {
    if (p.sku.trim().toLowerCase() === lower) return p;
    if (buildBarcodeVariants(p.barcode).some((v) => variants.has(v))) return p;
  }
  for (const p of products) {
    if (p.name.toLowerCase().includes(lower)) return p;
  }
  return null;
}
