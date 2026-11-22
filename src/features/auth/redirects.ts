const APP_ORIGIN = "https://app.invalid";

export function getSafeRedirectPath(next?: string | null): string {
  if (
    !next?.startsWith("/") ||
    next.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(next)
  ) {
    return "/";
  }
  try {
    const target = new URL(next, APP_ORIGIN);
    const decodedPath = decodeURIComponent(target.pathname);
    if (
      target.origin !== APP_ORIGIN ||
      decodedPath.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return "/";
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export function withRedirectParam(
  path: string,
  next?: string | null,
): string {
  const target = getSafeRedirectPath(next);
  return target === "/" ? path : `${path}?next=${encodeURIComponent(target)}`;
}

const GUEST_ONLY_PATHS = new Set(["/login", "/signup"]);

export function getAuthenticatedRedirect(
  pathname: string,
  next?: string | null,
): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (!GUEST_ONLY_PATHS.has(normalized)) {
    return null;
  }
  return getSafeRedirectPath(next);
}

export function resolveSiteOrigin({
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv = process.env.NODE_ENV,
  devFallbackOrigin = "http://localhost:3000",
}: {
  configuredSiteUrl?: string;
  nodeEnv?: string;
  devFallbackOrigin?: string;
} = {}): string | null {
  const trimmed = configuredSiteUrl?.trim();
  if (!trimmed) {
    if (nodeEnv !== "development") {
      return null;
    }
    try {
      const fallback = new URL(devFallbackOrigin);
      return fallback.protocol === "http:" || fallback.protocol === "https:"
        ? fallback.origin
        : null;
    } catch {
      return null;
    }
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}
