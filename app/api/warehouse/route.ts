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
    }
  | {
      action: "withdrawStock";
      payload: { productId: string; lines: Array<{ locationId: string; qty: number }> };
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

    if (body.action === "withdrawStock") {
      const { productId, lines } = body.payload;
      if (!productId?.trim() || !Array.isArray(lines)) {
        return NextResponse.json({ error: "INVALID_PAYLOAD", message: "بيانات السحب غير صالحة." }, { status: 400 });
      }

      const productExists = await prisma.product.findUnique({ where: { id: productId } });
      if (!productExists) {
        return NextResponse.json({ error: "PRODUCT_NOT_FOUND", message: "المنتج غير مسجل في النظام." }, { status: 404 });
      }

      const cleaned = lines
        .map((l) => ({
          locationId: String(l.locationId).trim(),
          qty: Math.floor(Number(l.qty))
        }))
        .filter((l) => l.locationId && l.qty > 0);

      if (cleaned.length === 0) {
        return NextResponse.json({ error: "INVALID_PAYLOAD", message: "حدد كمية أكبر من صفر على الأقل من مكان واحد." }, { status: 400 });
      }

      try {
        await prisma.$transaction(async (tx) => {
          for (const line of cleaned) {
            const row = await tx.stockEntry.findUnique({
              where: {
                productId_locationId: {
                  productId,
                  locationId: line.locationId
                }
              }
            });
            if (!row) {
              throw new Error("INSUFFICIENT_STOCK");
            }
            if (row.qty < line.qty) {
              throw new Error("INSUFFICIENT_STOCK");
            }
            const nextQty = row.qty - line.qty;
            if (nextQty === 0) {
              await tx.stockEntry.delete({ where: { id: row.id } });
            } else {
              await tx.stockEntry.update({
                where: { id: row.id },
                data: { qty: nextQty }
              });
            }
          }
        });
      } catch (e) {
        if (e instanceof Error && e.message === "INSUFFICIENT_STOCK") {
          return NextResponse.json(
            {
              error: "INSUFFICIENT_STOCK",
              message: "الكمية غير كافية في أحد الأماكن المحددة. راجع التوزيع أو الكميات المتوفرة."
            },
            { status: 409 }
          );
        }
        throw e;
      }
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
