import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth-session";
import { hashPassword } from "@/lib/auth-password";
import { PAGE_KEYS } from "@/lib/app-pages";

type AdminBody =
  | { action: "listUsers" }
  | { action: "listWarehouses" }
  | {
      action: "createUser";
      payload: {
        email: string;
        password: string;
        name?: string;
        systemRole?: "ADMIN" | "USER";
        memberships?: Array<{ warehouseId: string; role: "VIEWER" | "OPERATOR" | "MANAGER" }>;
      };
    }
  | {
      action: "updateUser";
      payload: {
        id: string;
        email?: string;
        password?: string;
        name?: string | null;
        active?: boolean;
        systemRole?: "ADMIN" | "USER";
      };
    }
  | { action: "deleteUser"; payload: { id: string } }
  | { action: "createWarehouse"; payload: { name: string } }
  | {
      action: "setMember";
      payload: { userId: string; warehouseId: string; role: "VIEWER" | "OPERATOR" | "MANAGER" };
    }
  | { action: "removeMember"; payload: { userId: string; warehouseId: string } }
  | { action: "setPageGrant"; payload: { userId: string; warehouseId: string; pageKey: string; allowed: boolean } }
  | { action: "removePageGrant"; payload: { userId: string; warehouseId: string; pageKey: string } }
  | { action: "listPageGrants"; payload?: { userId?: string; warehouseId?: string } };

function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.systemRole !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "هذه العملية للمسؤولين فقط.");
  }

  try {
    const body = (await req.json()) as AdminBody;

    if (body.action === "listUsers") {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
          active: true,
          createdAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              warehouseId: true,
              warehouse: { select: { id: true, name: true } }
            }
          }
        }
      });
      return NextResponse.json({ users });
    }

    if (body.action === "listWarehouses") {
      const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
      return NextResponse.json({ warehouses });
    }

    if (body.action === "createWarehouse") {
      const name = body.payload.name.trim();
      if (!name) return jsonError(400, "INVALID", "اسم المستودع مطلوب.");
      const w = await prisma.warehouse.create({ data: { name } });
      return NextResponse.json({ warehouse: w });
    }

    if (body.action === "createUser") {
      const { email, password, name, systemRole, memberships } = body.payload;
      const em = email.trim().toLowerCase();
      if (!em || !password || password.length < 6) {
        return jsonError(400, "INVALID", "البريد مطلوب وكلمة المرور 6 أحرف على الأقل.");
      }
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: em,
          passwordHash,
          name: name?.trim() || null,
          systemRole: systemRole === "ADMIN" ? "ADMIN" : "USER",
          memberships: memberships?.length
            ? {
                create: memberships.map((m) => ({
                  warehouseId: m.warehouseId,
                  role: m.role
                }))
              }
            : undefined
        },
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
          active: true,
          createdAt: true,
          memberships: { include: { warehouse: { select: { id: true, name: true } } } }
        }
      });
      return NextResponse.json({ user });
    }

    if (body.action === "updateUser") {
      const { id, email, password, name, active, systemRole } = body.payload;
      const data: Prisma.UserUpdateInput = {};
      if (email !== undefined) data.email = email.trim().toLowerCase();
      if (name !== undefined) data.name = name === null ? null : name.trim();
      if (active !== undefined) data.active = active;
      if (systemRole !== undefined) data.systemRole = systemRole;
      if (password !== undefined && password.length > 0) {
        data.passwordHash = await hashPassword(password);
      }
      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
          active: true,
          createdAt: true,
          memberships: { include: { warehouse: { select: { id: true, name: true } } } }
        }
      });
      return NextResponse.json({ user });
    }

    if (body.action === "deleteUser") {
      if (body.payload.id === session.userId) {
        return jsonError(400, "INVALID", "لا يمكنك تعطيل حسابك الحالي.");
      }
      await prisma.user.update({
        where: { id: body.payload.id },
        data: { active: false }
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setMember") {
      const { userId, warehouseId, role } = body.payload;
      await prisma.warehouseMember.upsert({
        where: { userId_warehouseId: { userId, warehouseId } },
        create: { userId, warehouseId, role },
        update: { role }
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "removeMember") {
      const { userId, warehouseId } = body.payload;
      await prisma.warehouseMember.deleteMany({ where: { userId, warehouseId } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setPageGrant") {
      const { userId, warehouseId, pageKey, allowed } = body.payload;
      if (!(PAGE_KEYS as readonly string[]).includes(pageKey)) {
        return jsonError(400, "INVALID", "مفتاح صفحة غير صالح.");
      }
      await prisma.warehousePageGrant.upsert({
        where: {
          userId_warehouseId_pageKey: { userId, warehouseId, pageKey }
        },
        create: { userId, warehouseId, pageKey, allowed },
        update: { allowed }
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "removePageGrant") {
      const { userId, warehouseId, pageKey } = body.payload;
      await prisma.warehousePageGrant.deleteMany({ where: { userId, warehouseId, pageKey } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "listPageGrants") {
      const { userId, warehouseId } = body.payload ?? {};
      const grants = await prisma.warehousePageGrant.findMany({
        where: {
          ...(userId ? { userId } : {}),
          ...(warehouseId ? { warehouseId } : {})
        },
        orderBy: [{ warehouseId: "asc" }, { userId: "asc" }, { pageKey: "asc" }]
      });
      return NextResponse.json({ grants });
    }

    return jsonError(400, "UNKNOWN_ACTION", "إجراء غير معروف.");
  } catch (error) {
    console.error("admin_api_error", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "ALREADY_EXISTS", "البريد أو القيمة موجودة مسبقًا.");
    }
    if (error instanceof Error) {
      return jsonError(500, "SERVER_ERROR", error.message);
    }
    return jsonError(500, "SERVER_ERROR", "خطأ في الخادم.");
  }
}
