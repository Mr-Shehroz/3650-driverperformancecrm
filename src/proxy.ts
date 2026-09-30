import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { matchRoute } from "@/lib/auth/roles";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session if needed and verifies the token
  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const { pathname } = request.nextUrl;

  // Logged-in users don't need the login page; "/" sends them to their portal
  if (pathname === "/login") {
    return loggedIn ? redirectTo("/") : response;
  }

  // Portal pages need a login. The layouts check the role (from the profiles table).
  if (matchRoute(pathname) && !loggedIn) {
    return redirectTo("/login");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest|favicon\\.ico|offline|driver-offline|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
