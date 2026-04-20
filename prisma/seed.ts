import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
  if (adminPassword.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters.");
  }

  let defaultWarehouse = await prisma.warehouse.findFirst({ orderBy: { createdAt: "asc" } });
  if (!defaultWarehouse) {
    defaultWarehouse = await prisma.warehouse.create({ data: { name: "المستودع الافتراضي" } });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: "مسؤول النظام",
      systemRole: "ADMIN",
      active: true
    },
    update: {
      passwordHash,
      systemRole: "ADMIN",
      active: true
    }
  });

  await prisma.warehouseMember.upsert({
    where: {
      userId_warehouseId: { userId: admin.id, warehouseId: defaultWarehouse.id }
    },
    create: { userId: admin.id, warehouseId: defaultWarehouse.id, role: "MANAGER" },
    update: { role: "MANAGER" }
  });

  const productCount = await prisma.product.count({ where: { warehouseId: defaultWarehouse.id } });
  if (productCount === 0) {
    await prisma.stockEntry.deleteMany({
      where: {
        OR: [{ product: { warehouseId: defaultWarehouse.id } }, { location: { warehouseId: defaultWarehouse.id } }]
      }
    });
    await prisma.product.deleteMany({ where: { warehouseId: defaultWarehouse.id } });
    await prisma.location.deleteMany({ where: { warehouseId: defaultWarehouse.id } });

    const p1 = await prisma.product.create({
      data: {
        warehouseId: defaultWarehouse.id,
        name: "Laptop Dell 14",
        sku: "SKU-1001",
        barcode: "8901001001",
        criticalQty: 10
      }
    });
    const p2 = await prisma.product.create({
      data: {
        warehouseId: defaultWarehouse.id,
        name: "Mouse Logitech M90",
        sku: "SKU-1002",
        barcode: "8901001002",
        criticalQty: 20
      }
    });
    const p3 = await prisma.product.create({
      data: {
        warehouseId: defaultWarehouse.id,
        name: "Keyboard K120",
        sku: "SKU-1003",
        barcode: "8901001003",
        criticalQty: 12
      }
    });

    const l1 = await prisma.location.create({
      data: { warehouseId: defaultWarehouse.id, name: "A-01-R1", qrCode: "LOC-A-01-R1" }
    });
    const l2 = await prisma.location.create({
      data: { warehouseId: defaultWarehouse.id, name: "A-01-R2", qrCode: "LOC-A-01-R2" }
    });
    const l3 = await prisma.location.create({
      data: { warehouseId: defaultWarehouse.id, name: "B-03-R1", qrCode: "LOC-B-03-R1" }
    });

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

  // eslint-disable-next-line no-console
  console.log("Seed OK. Admin:", adminEmail, "| Default warehouse:", defaultWarehouse.name, `(${defaultWarehouse.id})`);
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
