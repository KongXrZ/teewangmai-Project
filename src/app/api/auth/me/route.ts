import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้เข้าสู่ระบบ (Unauthorized)' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (profileError) {
      console.error('Current-user profile lookup failed', profileError);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
      profile,
    });
  } catch (err: unknown) {
    console.error('Current-user route failed', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
