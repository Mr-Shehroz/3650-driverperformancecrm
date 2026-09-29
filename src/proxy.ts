import { NextResponse, type NextRequest } from "next/server";
import { users } from "@/lib/mock/data";
import { SESSION_COOKIE, ROUTE_ROLES, homeFor } from "@/lib/auth/roles";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  const user = uid ? users.find((u) => u.id === uid && u.active) : null;

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }

  if (!rule) return NextResponse.next();

  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (user.role !== rule.role)
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/driver/:path*", "/sales/:path*"],
};
