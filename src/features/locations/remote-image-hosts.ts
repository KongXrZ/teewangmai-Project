export const REMOTE_IMAGE_HOSTS = [
  "bgm.kmutt.ac.th",
  "www.kmutt.ac.th",
  "sustainable.kmutt.ac.th",
  "upload.wikimedia.org",
  "encrypted-tbn0.gstatic.com",
] as const;

const REMOTE_IMAGE_HOST_SET: ReadonlySet<string> = new Set(REMOTE_IMAGE_HOSTS);

export function isOptimizableImageUrl(url: string): boolean {
  if (url.startsWith("/")) {
    return !url.startsWith("//");
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && REMOTE_IMAGE_HOST_SET.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}
