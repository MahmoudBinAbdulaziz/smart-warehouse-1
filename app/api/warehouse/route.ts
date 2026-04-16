import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWarehouseSnapshot } from "@/lib/warehouse-db";

type ActionPayload =
  | {
      action: "saveProduct";
      payload: { barcode: string; name: string; sku: string; criticalQty: number; qty: number; locationQr: string };
    }
  | {
      action: "addLocation";
      payload: { name: string; qrCode: string };
    }
  | {
      action: "updateProduct";
      payload: { id: string; name: string; sku: string; barcode: string; criticalQty: number };
    }
  | {
      action: "updateLocation";
      payload: { id: string; name: string; qrCode: string };
    }
  | {
      action: "clearLocationStock";
      payload: { locationId: string };
    };

export async function GET() {
  const snapshot = await getWarehouseSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ActionPayload;

    if (body.action === "saveProduct") {
      const { barcode, name, sku, criticalQty, qty, locationQr } = body.payload;
      if (!barcode || !name || !sku || !locationQr || !Number.isFinite(qty)) {
        return NextResponse.json({ error: "INVALID_PAYLOAD", message: "بيانات المنتج غير مكتملة." }, { status: 400 });
      }

      const location = await prisma.location.upsert({
        where: { qrCode: locationQr.trim().toUpperCase() },
        update: {},
        create: {
          name: `NEW-${locationQr.slice(0, 8).toUpperCase()}`,
          qrCode: locationQr.trim().toUpperCase()
        }
      });

      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [{ barcode: barcode.trim() }, { sku: sku.trim() }]
        }
      });

      const product =
        existingProduct ??
        (await prisma.product.create({
          data: {
            name: name.trim(),
            sku: sku.trim(),
            barcode: barcode.trim(),
            criticalQty: Number.isFinite(criticalQty) ? Math.max(0, Math.floor(criticalQty)) : 0
          }
        }));

      await prisma.stockEntry.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: location.id
          }
        },
        update: {
          qty: { increment: Math.max(0, Math.floor(qty)) }
        },
        create: {
          productId: product.id,
          locationId: location.id,
          qty: Math.max(0, Math.floor(qty))
        }
      });
    }

    if (body.action === "addLocation") {
      const { name, qrCode } = body.payload;
      if (!name?.trim() || !qrCode?.trim()) {
        return NextResponse.json({ error: "INVALID_PAYLOAD", message: "اسم المكان و QR مطلوبان." }, { status: 400 });
      }
      await prisma.location.create({
        data: {
          name: name.trim(),
          qrCode: qrCode.trim().toUpperCase()
        }
      });
    }

    if (body.action === "updateProduct") {
      const { id, name, sku, barcode, criticalQty } = body.payload;
      await prisma.product.update({
        where: { id },
        data: {
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim(),
          criticalQty: Math.max(0, Math.floor(criticalQty))
        }
      });
    }

    if (body.action === "updateLocation") {
      const { id, name, qrCode } = body.payload;
      await prisma.location.update({
        where: { id },
        data: {
          name: name.trim(),
          qrCode: qrCode.trim().toUpperCase()
        }
      });
    }

    if (body.action === "clearLocationStock") {
      await prisma.stockEntry.deleteMany({ where: { locationId: body.payload.locationId } });
    }

    const snapshot = await getWarehouseSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("warehouse_api_error", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "ALREADY_EXISTS", message: "القيمة موجودة مسبقًا." }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: "SERVER_ERROR", message: "تعذر تنفيذ العملية على قاعدة البيانات.", detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "SERVER_ERROR", message: "تعذر تنفيذ العملية على قاعدة البيانات." }, { status: 500 });
  }
}
