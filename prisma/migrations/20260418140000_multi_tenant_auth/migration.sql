-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "WarehouseRole" AS ENUM ('VIEWER', 'OPERATOR', 'MANAGER');

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "role" "WarehouseRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseMember_pkey" PRIMARY KEY ("id")
);

-- Default warehouse for existing rows
INSERT INTO "Warehouse" ("id", "name", "createdAt", "updatedAt")
VALUES ('wh_default_legacy', 'المستودع الافتراضي', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "warehouseId" TEXT;
UPDATE "Product" SET "warehouseId" = 'wh_default_legacy';
ALTER TABLE "Product" ALTER COLUMN "warehouseId" SET NOT NULL;

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN "warehouseId" TEXT;
UPDATE "Location" SET "warehouseId" = 'wh_default_legacy';
ALTER TABLE "Location" ALTER COLUMN "warehouseId" SET NOT NULL;

-- Drop old unique constraints
DROP INDEX IF EXISTS "Product_sku_key";
DROP INDEX IF EXISTS "Product_barcode_key";
DROP INDEX IF EXISTS "Location_qrCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "WarehouseMember_userId_warehouseId_key" ON "WarehouseMember"("userId", "warehouseId");

CREATE UNIQUE INDEX "Product_warehouseId_sku_key" ON "Product"("warehouseId", "sku");

CREATE UNIQUE INDEX "Product_warehouseId_barcode_key" ON "Product"("warehouseId", "barcode");

CREATE UNIQUE INDEX "Location_warehouseId_qrCode_key" ON "Location"("warehouseId", "qrCode");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseMember" ADD CONSTRAINT "WarehouseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseMember" ADD CONSTRAINT "WarehouseMember_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
