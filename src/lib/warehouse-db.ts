import { prisma } from "@/lib/prisma";

export type WarehouseSnapshot = {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string;
    criticalQty: number;
    expiresAt: string | null;
    expiryAlertDaysBefore: number;
  }>;
  locations: Array<{ id: string; name: string; qrCode: string }>;
  stock: Array<{ productId: string; locationId: string; qty: number }>;
};

export async function getWarehouseSnapshot(warehouseId: string): Promise<WarehouseSnapshot> {
  const [products, locations, stock] = await Promise.all([
    prisma.product.findMany({ where: { warehouseId }, orderBy: { createdAt: "asc" } }),
    prisma.location.findMany({ where: { warehouseId }, orderBy: { createdAt: "asc" } }),
    prisma.stockEntry.findMany({
      where: { product: { warehouseId }, location: { warehouseId } },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return {
    products: products.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      criticalQty: item.criticalQty,
      expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
      expiryAlertDaysBefore: item.expiryAlertDaysBefore
    })),
    locations: locations.map((item) => ({
      id: item.id,
      name: item.name,
      qrCode: item.qrCode
    })),
    stock: stock.map((item) => ({
      productId: item.productId,
      locationId: item.locationId,
      qty: item.qty
    }))
  };
}
