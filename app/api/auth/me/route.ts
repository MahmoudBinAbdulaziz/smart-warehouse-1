import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth-session";
import { loadPageGrantsForUser } from "@/lib/page-grants-db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, systemRole: true, active: true }
  });
  if (!user || !user.active) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const pageGrants = await loadPageGrantsForUser(user.id);

  if (user.systemRole === "ADMIN") {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });
    return NextResponse.json({
      user,
      warehouses: warehouses.map((w) => ({ ...w, role: "MANAGER" as const })),
      pageGrants
    });
  }

  const rows = await prisma.warehouseMember.findMany({
    where: { userId: user.id },
    include: { warehouse: { select: { id: true, name: true } } },
    orderBy: { warehouse: { name: "asc" } }
  });

  return NextResponse.json({
    user,
    warehouses: rows.map((r) => ({
      id: r.warehouse.id,
      name: r.warehouse.name,
      role: r.role
    })),
    pageGrants
  });
}
