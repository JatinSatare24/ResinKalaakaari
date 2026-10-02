import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isCheckout = pathname.startsWith("/checkout");
  const isMyOrders = pathname.startsWith("/my-orders");
  const isProfile = pathname.startsWith("/profile");
  const isAdmin = pathname.startsWith("/admin");

  // Auth gate: covers every signed-in area. This is only the FIRST,
  // optimistic gate (fast redirect, no role check: that would need a database
  // call on every request). Each protected page checks again on the server
  // (requireUser / requireAdmin), and RLS protects the data itself.
  if (!user && (isCheckout || isMyOrders || isProfile || isAdmin)) {
    const loginUrl = new URL("/login", request.url);
    // Remember where they were going; login sends them back (see safe-next.ts).
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
