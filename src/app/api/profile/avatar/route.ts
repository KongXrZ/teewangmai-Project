import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";
import {
  createAvatarDeleteDeps,
  createAvatarUploadDeps,
  deleteProfileAvatar,
  uploadProfileAvatar,
} from "@/features/profile/server/avatar-storage";

function fail(status: number, code: string, error: string) {
  return authJson({ success: false, code, error }, status);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const result = await uploadProfileAvatar(
      createAvatarUploadDeps(supabase),
      request,
    );
    if (!result.ok) {
      return fail(result.status, result.code, result.error);
    }
    return authJson({ success: true, data: result.data });
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
