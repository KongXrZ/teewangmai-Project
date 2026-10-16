import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const LOGIN_ERROR = 'ลิงก์ยืนยันตัวตนหมดอายุหรือไม่ถูกต้อง';

function getRedirectBase(requestUrl: string): URL | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredSiteUrl) {
    return process.env.NODE_ENV === 'development' ? new URL(new URL(requestUrl).origin) : null;
  }

  try {
    const base = new URL(configuredSiteUrl);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
    return new URL(base.origin);
  } catch {
    return null;
  }
}

function getSafeNextUrl(next: string, base: URL): URL {
  if (!next.startsWith('/') || next.startsWith('//')) return new URL('/', base);

  try {
    const target = new URL(next, base);
    return target.origin === base.origin ? target : new URL('/', base);
  } catch {
    return new URL('/', base);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const base = getRedirectBase(request.url);
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'NEXT_PUBLIC_SITE_URL must be configured for OAuth callbacks' },
      { status: 500 }
    );
  }

  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(getSafeNextUrl(next, base));
    }
  }

  const errorUrl = new URL('/login', base);
  errorUrl.searchParams.set('error', LOGIN_ERROR);
  return NextResponse.redirect(errorUrl);
}
