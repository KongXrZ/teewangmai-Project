import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, checkAvatar } from "@/features/profile/avatar";
import {
  createAvatarDeleteDeps,
  deleteProfileAvatar,
} from "@/features/profile/server/avatar-storage";

const maxRequestBytes = AVATAR_MAX_BYTES + 64 * 1024;

function fail(status: number, code: string, error: string) {
  return authJson({ success: false, code, error }, status);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return fail(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อนทำรายการ");
    }

    if (
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "multipart/form-data"
    ) {
      return fail(415, "validation", "กรุณาส่งไฟล์แบบ multipart/form-data");
    }
    if (Number(request.headers.get("content-length") ?? 0) > maxRequestBytes) {
      return fail(413, "validation", "ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB");
    }

    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return fail(400, "validation", "ข้อมูลไฟล์ไม่ถูกต้อง");
    }
    if (!(file instanceof File)) {
      return fail(400, "validation", "กรุณาเลือกไฟล์รูปภาพ");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkAvatar(bytes);
    if (!check.ok) {
      return fail(400, "validation", check.error);
    }

    const path = `${user.id}/${crypto.randomUUID()}.${check.extension}`;
    const storage = supabase.storage.from(AVATAR_BUCKET);
    const { error } = await storage.upload(path, bytes, {
      contentType: check.contentType,
      upsert: false,
    });
    if (error) {
      return fail(503, "unavailable", "อัปโหลดรูปไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
    }

    return authJson({
      success: true,
      data: { avatar_url: storage.getPublicUrl(path).data.publicUrl },
    });
  } catch {
    return fail(503, "unavailable", "อัปโหลดรูปไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const result = await deleteProfileAvatar(createAvatarDeleteDeps(supabase), request.url);
    if (!result.ok) {
      return fail(result.status, result.code, result.error);
    }
    return authJson({ success: true, data: result.data });
  } catch {
    return fail(503, "unavailable", "ลบรูปโปรไฟล์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
  }
}
