import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth-session";
import { assertCanViewAppPage } from "@/lib/app-page-guard";

const PAGE_SIZE = 40;

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const warehouseId = (url.searchParams.get("warehouseId") ?? "").trim();
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page") ?? "1") || 1));
  if (!warehouseId) {
    return NextResponse.json({ error: "MISSING_WAREHOUSE" }, { status: 400 });
  }
  try {
    await assertCanViewAppPage(session, warehouseId, "audit");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAGE_FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "FORBIDDEN_WAREHOUSE") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "WAREHOUSE_NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    throw e;
  }

  const skip = (page - 1) * PAGE_SIZE;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { warehouseId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.auditLog.count({ where: { warehouseId } })
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: items.map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      action: a.action,
      userEmail: a.user?.email ?? "—",
      userName: a.user?.name,
      details: a.details
    }))
  });
}
