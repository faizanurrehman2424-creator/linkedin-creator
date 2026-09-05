import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLinkedInAuthUrl } from '@/lib/linkedin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

    // State carries user id to protect against CSRF and identify user on callback
    const state = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64');
    const authUrl = getLinkedInAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('LinkedIn connect error:', error);
    return NextResponse.redirect(new URL('/settings?error=linkedin_config_error', request.url));
  }
}
