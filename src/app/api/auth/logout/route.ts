import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout route failed', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ',
    });
  } catch (err: unknown) {
    console.error('Logout route failed', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
