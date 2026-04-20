import * as jose from "jose";
import type { SystemRole } from "@prisma/client";

export type SessionJwtPayload = {
  sub: string;
  email: string;
  systemRole: SystemRole;
};

function getSecretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: SessionJwtPayload): Promise<string> {
  const secret = getSecretKey();
  return new jose.SignJWT({
    email: payload.email,
    systemRole: payload.systemRole
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const systemRole = payload.systemRole as SystemRole;
    if (!sub || !email || (systemRole !== "ADMIN" && systemRole !== "USER")) {
      return null;
    }
    return { sub, email, systemRole };
  } catch {
    return null;
  }
}
