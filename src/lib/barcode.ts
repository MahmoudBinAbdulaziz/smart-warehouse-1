function toEnglishDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function normalizeBarcode(value: string): string {
  const englishDigits = toEnglishDigits(value);
  return englishDigits.replace(/\D/g, "");
}

/** UPC-A (12) vs EAN-13 (13) compatibility for Saudi market scanners */
export function buildBarcodeVariants(value: string): string[] {
  const normalized = normalizeBarcode(value);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);
  if (normalized.length === 12) variants.add(`0${normalized}`);
  if (normalized.length === 13 && normalized.startsWith("0")) variants.add(normalized.slice(1));

  return [...variants];
}

export function barcodeSearchMatches(query: string, productBarcode: string): boolean {
  const candidates = new Set(buildBarcodeVariants(query));
  return buildBarcodeVariants(productBarcode).some((b) => candidates.has(b));
}
