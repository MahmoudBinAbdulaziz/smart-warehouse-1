import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth-session";
import { assertCanViewAppPage } from "@/lib/app-page-guard";
import { classifyExpiry } from "@/lib/product-expiry";

const WITHDRAW_LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;
const ACTIVITY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const warehouseId = (url.searchParams.get("warehouseId") ?? "").trim();
  if (!warehouseId) {
    return NextResponse.json({ error: "MISSING_WAREHOUSE" }, { status: 400 });
  }
  try {
    await assertCanViewAppPage(session, warehouseId, "statistics");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAGE_FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "FORBIDDEN_WAREHOUSE") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "WAREHOUSE_NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    throw e;
  }

  const withdrawSince = new Date(Date.now() - WITHDRAW_LOOKBACK_MS);
  const activitySince = new Date(Date.now() - ACTIVITY_LOOKBACK_MS);

  const [products, locations, stock, auditByAction, recentAudits, topStock, withdrawLogs, userActivity] =
    await Promise.all([
      prisma.product.findMany({
        where: { warehouseId },
        select: {
          id: true,
          name: true,
          sku: true,
          criticalQty: true,
          expiresAt: true,
          expiryAlertDaysBefore: true
        }
      }),
      prisma.location.findMany({ where: { warehouseId }, select: { id: true, name: true } }),
      prisma.stockEntry.findMany({
        where: { product: { warehouseId }, location: { warehouseId } },
        select: { productId: true, locationId: true, qty: true }
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { warehouseId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        _count: { id: true }
      }),
      prisma.auditLog.findMany({
        where: { warehouseId },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { user: { select: { email: true } } }
      }),
      prisma.stockEntry.findMany({
        where: { product: { warehouseId } },
        select: { productId: true, qty: true, product: { select: { name: true, sku: true } } }
      }),
      prisma.auditLog.findMany({
        where: { warehouseId, action: "withdrawStock", createdAt: { gte: withdrawSince } },
        select: { details: true }
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: { warehouseId, userId: { not: null }, createdAt: { gte: activitySince } },
        _count: { id: true }
      })
    ]);

  const productQty = new Map<string, number>();
  for (const s of stock) {
    productQty.set(s.productId, (productQty.get(s.productId) ?? 0) + s.qty);
  }

  let totalUnits = 0;
  let criticalProducts = 0;
  let zeroStockProducts = 0;
  let expiringSoonProducts = 0;
  let expiredProducts = 0;
  const expiryRows: Array<{
    productId: string;
    name: string;
    sku: string;
    expiresAt: string;
    daysLeft: number;
    alertDaysBefore: number;
    kind: "soon" | "expired";
  }> = [];

  const now = new Date();
  for (const p of products) {
    const q = productQty.get(p.id) ?? 0;
    totalUnits += q;
    if (q <= p.criticalQty) criticalProducts += 1;
    if (q === 0) zeroStockProducts += 1;

    const c = classifyExpiry(p.expiresAt, p.expiryAlertDaysBefore, now);
    if (p.expiresAt) {
      if (c.kind === "expired") {
        expiredProducts += 1;
        expiryRows.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          expiresAt: p.expiresAt.toISOString(),
          daysLeft: c.daysLeft ?? 0,
          alertDaysBefore: p.expiryAlertDaysBefore,
          kind: "expired"
        });
      } else if (c.kind === "soon") {
        expiringSoonProducts += 1;
        expiryRows.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          expiresAt: p.expiresAt.toISOString(),
          daysLeft: c.daysLeft ?? 0,
          alertDaysBefore: p.expiryAlertDaysBefore,
          kind: "soon"
        });
      }
    }
  }

  expiryRows.sort((a, b) => a.daysLeft - b.daysLeft);

  const locationTotals = new Map<string, number>();
  for (const s of stock) {
    locationTotals.set(s.locationId, (locationTotals.get(s.locationId) ?? 0) + s.qty);
  }
  const stockByLocation = locations.map((loc) => ({
    locationId: loc.id,
    locationName: loc.name,
    units: locationTotals.get(loc.id) ?? 0
  }));

  const productTotalsForTop = new Map<string, { name: string; sku: string; units: number }>();
  for (const row of topStock) {
    const cur = productTotalsForTop.get(row.productId) ?? {
      name: row.product.name,
      sku: row.product.sku,
      units: 0
    };
    cur.units += row.qty;
    productTotalsForTop.set(row.productId, cur);
  }
  const topProductsByUnits = [...productTotalsForTop.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  const withdrawByProduct = new Map<string, number>();
  for (const log of withdrawLogs) {
    const d = log.details as { productId?: unknown; totalQty?: unknown } | null;
    if (!d || typeof d.productId !== "string") continue;
    const q = typeof d.totalQty === "number" && Number.isFinite(d.totalQty) ? Math.max(0, Math.floor(d.totalQty)) : 0;
    withdrawByProduct.set(d.productId, (withdrawByProduct.get(d.productId) ?? 0) + q);
  }
  const topProductsByWithdrawal = [...withdrawByProduct.entries()]
    .map(([productId, withdrawnUnits]) => {
      const meta = products.find((x) => x.id === productId);
      return {
        productId,
        name: meta?.name ?? "—",
        sku: meta?.sku ?? "—",
        withdrawnUnits
      };
    })
    .filter((x) => x.withdrawnUnits > 0)
    .sort((a, b) => b.withdrawnUnits - a.withdrawnUnits)
    .slice(0, 10);

  const userIds = userActivity.map((u) => u.userId).filter((id): id is string => id !== null);
  const usersForActivity =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true }
        })
      : [];
  const emailById = new Map(usersForActivity.map((u) => [u.id, u.email]));
  const topUsersByActivity = [...userActivity]
    .map((u) => ({
      userId: u.userId as string,
      email: emailById.get(u.userId as string) ?? "—",
      actionCount: u._count.id
    }))
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, 10);

  return NextResponse.json({
    warehouseId,
    summary: {
      productCount: products.length,
      locationCount: locations.length,
      stockLineCount: stock.length,
      totalUnits,
      criticalProducts,
      zeroStockProducts,
      expiringSoonProducts,
      expiredProducts,
      withdrawEventsLookbackDays: 365,
      activityLookbackDays: 30
    },
    stockByLocation,
    auditLast30Days: auditByAction.map((a) => ({ action: a.action, count: a._count.id })),
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      action: a.action,
      userEmail: a.user?.email ?? "—",
      details: a.details
    })),
    topProductsByUnits,
    topProductsByWithdrawal,
    topUsersByActivity,
    expiryAlerts: expiryRows.slice(0, 25)
  });
}
