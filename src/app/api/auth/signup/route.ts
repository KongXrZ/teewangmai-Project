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

    return NextResponse.json({
      success: true,
      message: data.session
        ? 'สมัครสมาชิกสำเร็จและเข้าสู่ระบบเรียบร้อยแล้ว'
        : 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน',
      requiresEmailConfirmation: !data.session,
    });
  } catch (err: unknown) {
    console.error('Signup route failed', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
