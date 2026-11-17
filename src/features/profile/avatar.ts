export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const signatures = [
  { type: "image/jpeg", extension: "jpg", bytes: [0xff, 0xd8, 0xff] },
  {
    type: "image/png",
    extension: "png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
] as const;

export type AvatarCheck =
  | { ok: true; contentType: "image/jpeg" | "image/png"; extension: "jpg" | "png" }
  | { ok: false; error: string };

export function checkAvatar(bytes: Uint8Array): AvatarCheck {
  if (bytes.length === 0) {
    return { ok: false, error: "กรุณาเลือกไฟล์รูปภาพ" };
  }
  if (bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, error: "ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB" };
  }
  const match = signatures.find((signature) =>
    signature.bytes.every((byte, index) => bytes[index] === byte),
  );
  if (!match) {
    return { ok: false, error: "รองรับเฉพาะไฟล์ JPG หรือ PNG" };
  }
  return { ok: true, contentType: match.type, extension: match.extension };
}

export function avatarObjectPath(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;
  let pathname: string;
  try {
    pathname = new URL(publicUrl).pathname;
  } catch {
    return null;
  }
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  return pathname.startsWith(marker)
    ? decodeURIComponent(pathname.slice(marker.length))
    : null;
}
