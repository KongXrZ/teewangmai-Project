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
