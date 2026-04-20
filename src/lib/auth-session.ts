import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/auth-jwt";
import type { AuthUserContext } from "@/lib/warehouse-access";

export async function getSessionFromCookies(): Promise<AuthUserContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const jwt = await verifySessionToken(token);
  if (!jwt) return null;
  const user = await prisma.user.findUnique({
    where: { id: jwt.sub },
    select: { id: true, email: true, systemRole: true, active: true }
  });
  if (!user || !user.active) return null;
  return { userId: user.id, email: user.email, systemRole: user.systemRole };
}

export async function requireSession(): Promise<AuthUserContext> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
