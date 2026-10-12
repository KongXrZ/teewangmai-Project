import { createClient } from '@/lib/supabase/server';
import { signUpSchema } from '@/features/auth/schemas';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    let profile = null;
    if (data.user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', data.user.id)
        .single();
      profile = profileData;
    }

    return NextResponse.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ บัญชีและโปรไฟล์ถูกสร้างเรียบร้อยแล้ว',
      user: data.user,
      profile,
      session: data.session,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
