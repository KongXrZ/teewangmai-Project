import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/features/auth/redirects";
import { AUTH_UNAVAILABLE } from "@/features/auth/errors";

const LOGIN_ERROR = "verification_failed";

function getRedirectBase(requestUrl: string): URL | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredSiteUrl) {
    return process.env.NODE_ENV === "development"
      ? new URL(new URL(requestUrl).origin)
      : null;
  }

  try {
    const base = new URL(configuredSiteUrl);
    if (base.protocol !== "https:" && base.protocol !== "http:") return null;
    return new URL(base.origin);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const base = getRedirectBase(request.url);
  if (!base) {
    return NextResponse.json(
      {
        success: false,
        error: AUTH_UNAVAILABLE,
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(getSafeRedirectPath(next), base), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    } catch {
      // Keep network/configuration errors out of the redirect query and UI.
    }
  }

  const errorUrl = new URL("/login", base);
  errorUrl.searchParams.set("error", LOGIN_ERROR);
  return NextResponse.redirect(errorUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
