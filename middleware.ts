import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const LOGIN_PATH = "/login";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/products",
  "/locations",
  "/withdraw",
  "/add-product",
  "/add-location",
  "/statistics",
  "/audit",
  "/admin"
];

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  let valid = false;
  if (token && secret && secret.length >= 32) {
    try {
      await jose.jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (valid) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    if (!valid) {
      return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard",
    "/products",
    "/locations",
    "/withdraw",
    "/add-product",
    "/add-location",
    "/statistics",
    "/audit",
    "/admin"
  ]
};
