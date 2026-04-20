import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-password";
import { signSessionToken } from "@/lib/auth-jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ error: "INVALID", message: "البريد وكلمة المرور مطلوبان." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (e) {
    console.error("auth_login", e);
    if (e instanceof Error && e.message.includes("AUTH_SECRET")) {
      return NextResponse.json(
        { error: "SERVER_MISCONFIG", message: "لم يُضبط AUTH_SECRET على الخادم (32 حرفًا على الأقل)." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "SERVER_ERROR", message: "تعذر تسجيل الدخول." }, { status: 500 });
  }
}
