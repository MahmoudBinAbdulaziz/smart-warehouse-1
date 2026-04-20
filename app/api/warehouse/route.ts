import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWarehouseSnapshot } from "@/lib/warehouse-db";
import { getSessionFromCookies } from "@/lib/auth-session";
import { assertCanWrite, assertWarehouseAccess } from "@/lib/warehouse-access";
import { logWarehouseAudit } from "@/lib/audit-service";
import { parseExpiryDateInput } from "@/lib/product-expiry";

type ActionPayload =
  | {
      warehouseId: string;
      action: "saveProduct";
      payload: {
        barcode: string;
        name: string;
        sku: string;
        criticalQty: number;
        qty: number;
        locationQr: string;
        expiresAt?: string | null;
        expiryAlertDaysBefore?: number;
      };
    }
  | {
      warehouseId: string;
      action: "addLocation";
      payload: { name: string; qrCode: string };
    }
  | {
      warehouseId: string;
      action: "updateProduct";
      payload: {
        id: string;
        name: string;
        sku: string;
        barcode: string;
        criticalQty: number;
        expiresAt?: string | null;
        expiryAlertDaysBefore?: number;
      };
    }
  | {
      warehouseId: string;
      action: "updateLocation";
      payload: { id: string; name: string; qrCode: string };
    }
  | {
      warehouseId: string;
      action: "clearLocationStock";
      payload: { locationId: string };
    }
    | {
      warehouseId: string;
      action: "withdrawStock";
      payload: { productId: string; lines: Array<{ locationId: string; qty: number }> };
    };

function auditDetailsFor(body: ActionPayload): Prisma.InputJsonValue {
  switch (body.action) {
    case "withdrawStock": {
      const sum = body.payload.lines.reduce((s, l) => s + Math.floor(Number(l.qty) || 0), 0);
      return {
        productId: body.payload.productId,
        lineCount: body.payload.lines.length,
        totalQty: sum
      };
    }
    default:
      return JSON.parse(JSON.stringify(body.payload)) as Prisma.InputJsonValue;
  }
}

function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "يجب تسجيل الدخول.");
  }
  const url = new URL(req.url);
  const warehouseId = (url.searchParams.get("warehouseId") ?? "").trim();
  if (!warehouseId) {
    return jsonError(400, "MISSING_WAREHOUSE", "حدد المستودع.");
  }
  try {
    await assertWarehouseAccess(session, warehouseId);
    const snapshot = await getWarehouseSnapshot(warehouseId);
    return NextResponse.json(snapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "WAREHOUSE_NOT_FOUND") return jsonError(404, "NOT_FOUND", "المستودع غير موجود.");
    if (msg === "FORBIDDEN_WAREHOUSE") return jsonError(403, "FORBIDDEN", "لا تملك صلاحية الوصول لهذا المستودع.");
    throw e;
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "يجب تسجيل الدخول.");
  }

  try {
    const body = (await req.json()) as ActionPayload;
    const warehouseId = (body as { warehouseId?: string }).warehouseId?.trim() ?? "";
    if (!warehouseId) {
      return jsonError(400, "MISSING_WAREHOUSE", "حدد المستودع في الطلب.");
    }

    const access = await assertWarehouseAccess(session, warehouseId);
    assertCanWrite(access);

    if (body.action === "saveProduct") {
      const { barcode, name, sku, criticalQty, qty, locationQr, expiresAt, expiryAlertDaysBefore } = body.payload;
      if (!barcode || !name || !sku || !locationQr || !Number.isFinite(qty)) {
        return jsonError(400, "INVALID_PAYLOAD", "بيانات المنتج غير مكتملة.");
      }

      const qr = locationQr.trim().toUpperCase();
      const location = await prisma.location.upsert({
        where: { warehouseId_qrCode: { warehouseId, qrCode: qr } },
        update: {},
        create: {
          warehouseId,
          name: `NEW-${qr.slice(0, 12)}`,
          qrCode: qr
        }
      });

      const existingProduct = await prisma.product.findFirst({
        where: {
          warehouseId,
          OR: [{ barcode: barcode.trim() }, { sku: sku.trim() }]
        }
      });

      let newExpiresAt: Date | null = null;
      if (expiresAt !== undefined && expiresAt !== null && String(expiresAt).trim() !== "") {
        const d = parseExpiryDateInput(String(expiresAt).trim());
        if (!d) {
          return jsonError(400, "INVALID_EXPIRY", "تاريخ انتهاء الصلاحية غير صالح (استخدم صيغة YYYY-MM-DD).");
        }
        newExpiresAt = d;
      }
      const newAlertDays =
        expiryAlertDaysBefore !== undefined && Number.isFinite(Number(expiryAlertDaysBefore))
          ? Math.max(0, Math.floor(Number(expiryAlertDaysBefore)))
          : 30;

      const product =
        existingProduct ??
        (await prisma.product.create({
          data: {
            warehouseId,
            name: name.trim(),
            sku: sku.trim(),
            barcode: barcode.trim(),
            criticalQty: Number.isFinite(criticalQty) ? Math.max(0, Math.floor(criticalQty)) : 0,
            expiresAt: newExpiresAt,
            expiryAlertDaysBefore: newAlertDays
          }
        }));

      if (product.warehouseId !== warehouseId) {
        return jsonError(400, "INVALID_PRODUCT", "المنتج لا ينتمي لهذا المستودع.");
      }
      if (location.warehouseId !== warehouseId) {
        return jsonError(400, "INVALID_LOCATION", "المكان لا ينتمي لهذا المستودع.");
      }

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

      if (existingProduct && (expiresAt !== undefined || expiryAlertDaysBefore !== undefined)) {
        const data: Prisma.ProductUpdateInput = {};
        if (expiresAt !== undefined) {
          if (expiresAt === null || String(expiresAt).trim() === "") {
            data.expiresAt = null;
          } else {
            const d = parseExpiryDateInput(String(expiresAt).trim());
            if (!d) {
              return jsonError(400, "INVALID_EXPIRY", "تاريخ انتهاء الصلاحية غير صالح (استخدم صيغة YYYY-MM-DD).");
            }
            data.expiresAt = d;
          }
        }
        if (expiryAlertDaysBefore !== undefined && Number.isFinite(Number(expiryAlertDaysBefore))) {
          data.expiryAlertDaysBefore = Math.max(0, Math.floor(Number(expiryAlertDaysBefore)));
        }
        if (Object.keys(data).length > 0) {
          await prisma.product.update({ where: { id: product.id }, data });
        }
      }
    }

    if (body.action === "addLocation") {
      const { name, qrCode } = body.payload;
      if (!name?.trim() || !qrCode?.trim()) {
        return jsonError(400, "INVALID_PAYLOAD", "اسم المكان و QR مطلوبان.");
      }
      await prisma.location.create({
        data: {
          warehouseId,
          name: name.trim(),
          qrCode: qrCode.trim().toUpperCase()
        }
      });
    }

    if (body.action === "updateProduct") {
      const { id, name, sku, barcode, criticalQty, expiresAt, expiryAlertDaysBefore } = body.payload;
      const p = await prisma.product.findFirst({ where: { id, warehouseId } });
      if (!p) return jsonError(404, "NOT_FOUND", "المنتج غير موجود.");
      const data: Prisma.ProductUpdateInput = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        criticalQty: Math.max(0, Math.floor(criticalQty))
      };
      if (expiresAt !== undefined) {
        if (expiresAt === null || String(expiresAt).trim() === "") {
          data.expiresAt = null;
        } else {
          const d = parseExpiryDateInput(String(expiresAt).trim());
          if (!d) {
            return jsonError(400, "INVALID_EXPIRY", "تاريخ انتهاء الصلاحية غير صالح (استخدم صيغة YYYY-MM-DD).");
          }
          data.expiresAt = d;
        }
      }
      if (expiryAlertDaysBefore !== undefined && Number.isFinite(Number(expiryAlertDaysBefore))) {
        data.expiryAlertDaysBefore = Math.max(0, Math.floor(Number(expiryAlertDaysBefore)));
      }
      await prisma.product.update({
        where: { id },
        data
      });
    }

    if (body.action === "updateLocation") {
      const { id, name, qrCode } = body.payload;
      const loc = await prisma.location.findFirst({ where: { id, warehouseId } });
      if (!loc) return jsonError(404, "NOT_FOUND", "المكان غير موجود.");
      await prisma.location.update({
        where: { id },
        data: {
          name: name.trim(),
          qrCode: qrCode.trim().toUpperCase()
        }
      });
    }

    if (body.action === "clearLocationStock") {
      const loc = await prisma.location.findFirst({
        where: { id: body.payload.locationId, warehouseId }
      });
      if (!loc) return jsonError(404, "NOT_FOUND", "المكان غير موجود.");
      await prisma.stockEntry.deleteMany({ where: { locationId: body.payload.locationId } });
    }

    if (body.action === "withdrawStock") {
      const { productId, lines } = body.payload;
      if (!productId?.trim() || !Array.isArray(lines)) {
        return jsonError(400, "INVALID_PAYLOAD", "بيانات السحب غير صالحة.");
      }

      const productExists = await prisma.product.findFirst({ where: { id: productId, warehouseId } });
      if (!productExists) {
        return jsonError(404, "PRODUCT_NOT_FOUND", "المنتج غير مسجل في هذا المستودع.");
      }

      const cleaned = lines
        .map((l) => ({
          locationId: String(l.locationId).trim(),
          qty: Math.floor(Number(l.qty))
        }))
        .filter((l) => l.locationId && l.qty > 0);

      if (cleaned.length === 0) {
        return jsonError(400, "INVALID_PAYLOAD", "حدد كمية أكبر من صفر على الأقل من مكان واحد.");
      }

      for (const line of cleaned) {
        const loc = await prisma.location.findFirst({ where: { id: line.locationId, warehouseId } });
        if (!loc) {
          return jsonError(400, "INVALID_LOCATION", "أحد الأماكن لا ينتمي لهذا المستودع.");
        }
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

    await logWarehouseAudit({
      warehouseId,
      userId: session.userId,
      action: body.action,
      details: auditDetailsFor(body)
    });

    const snapshot = await getWarehouseSnapshot(warehouseId);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("warehouse_api_error", error);
    if (error instanceof Error) {
      if (error.message === "READ_ONLY") {
        return jsonError(403, "READ_ONLY", "صلاحيتك على هذا المستودع: عرض فقط.");
      }
      if (error.message === "FORBIDDEN_WAREHOUSE") {
        return jsonError(403, "FORBIDDEN", "لا تملك صلاحية الوصول لهذا المستودع.");
      }
      if (error.message === "WAREHOUSE_NOT_FOUND") {
        return jsonError(404, "NOT_FOUND", "المستودع غير موجود.");
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "ALREADY_EXISTS", "القيمة موجودة مسبقًا في هذا المستودع.");
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "SERVER_ERROR", message: "تعذر تنفيذ العملية على قاعدة البيانات.", detail: error.message },
        { status: 500 }
      );
    }
    return jsonError(500, "SERVER_ERROR", "تعذر تنفيذ العملية على قاعدة البيانات.");
  }
}
