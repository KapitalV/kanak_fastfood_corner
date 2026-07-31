import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Keep the UI usable during local setup before Supabase credentials exist.
  // Auth and role checks become active automatically once the environment is configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            supabaseResponse.cookies.set(name, value, cookieOptions),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/orders") ||
    request.nextUrl.pathname.startsWith("/store") ||
    request.nextUrl.pathname.startsWith("/delivery") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/checkout");

  // If logged in and trying to access auth pages, redirect to home
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not logged in and trying to access protected pages, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
    const roleByPath: Array<[string, string]> = [["/admin", "admin"], ["/store", "store"], ["/delivery", "delivery"]];
    const requiredRole = roleByPath.find(([prefix]) => request.nextUrl.pathname.startsWith(prefix))?.[1];
    if (profile?.is_active === false || (requiredRole && profile?.role !== requiredRole && profile?.role !== "admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Role-based protection will be handled by Layouts/RoleGate components
  // because fetching the profile in middleware adds latency to every request.

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
