import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedRedirect } from "@/features/auth/redirects";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  let authHeaders: Record<string, string> = {};

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        authHeaders = headers;
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  let isAuthenticated = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      isAuthenticated = true;
    }
  } catch {
    // This proxy refreshes cookies, not authorization. Public pages must remain
    // usable during an Auth outage; protected operations verify the user again.
  }

  const redirectPath = isAuthenticated
    ? getAuthenticatedRedirect(
        request.nextUrl.pathname,
        request.nextUrl.searchParams.get("next"),
      )
    : null;

  if (redirectPath) {
    const redirectResponse = NextResponse.redirect(
      new URL(redirectPath, request.url),
    );
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([name, value]) =>
      redirectResponse.headers.set(name, value),
    );
    return redirectResponse;
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
