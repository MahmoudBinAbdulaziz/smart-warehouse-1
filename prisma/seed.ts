import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.stockEntry.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();

  const p1 = await prisma.product.create({
    data: { name: "Laptop Dell 14", sku: "SKU-1001", barcode: "8901001001", criticalQty: 10 }
  });
  const p2 = await prisma.product.create({
    data: { name: "Mouse Logitech M90", sku: "SKU-1002", barcode: "8901001002", criticalQty: 20 }
  });
  const p3 = await prisma.product.create({
    data: { name: "Keyboard K120", sku: "SKU-1003", barcode: "8901001003", criticalQty: 12 }
  });

  const l1 = await prisma.location.create({ data: { name: "A-01-R1", qrCode: "LOC-A-01-R1" } });
  const l2 = await prisma.location.create({ data: { name: "A-01-R2", qrCode: "LOC-A-01-R2" } });
  const l3 = await prisma.location.create({ data: { name: "B-03-R1", qrCode: "LOC-B-03-R1" } });

  await prisma.stockEntry.createMany({
    data: [
      { productId: p1.id, locationId: l1.id, qty: 4 },
      { productId: p1.id, locationId: l2.id, qty: 9 },
      { productId: p2.id, locationId: l1.id, qty: 8 },
      { productId: p2.id, locationId: l3.id, qty: 19 },
      { productId: p3.id, locationId: l2.id, qty: 5 }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
