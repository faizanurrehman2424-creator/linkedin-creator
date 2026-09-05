import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, fetchLinkedInUserInfo } from '@/lib/linkedin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (error || !code || !stateRaw) {
    console.error('LinkedIn OAuth returned error:', error, errorDescription);
    return NextResponse.redirect(`${appUrl}/settings?linkedin_error=${encodeURIComponent(errorDescription || error || 'Authorization was cancelled')}`);
  }

  try {
    const stateObj = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
    const userId = stateObj.userId;

    if (!userId) {
      throw new Error('Invalid state verification parameter');
    }

    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const userInfo = await fetchLinkedInUserInfo(tokenData.access_token);

    // Save tokens and LinkedIn profile data in Supabase profiles
    const supabaseAdmin = await createAdminClient();
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        linkedin_connected: true,
        linkedin_access_token: tokenData.access_token,
        timezone: 'Asia/Karachi',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Supabase profile update error on LinkedIn callback:', updateError);
      throw updateError;
    }

    return NextResponse.redirect(`${appUrl}/settings?linkedin=connected`);
  } catch (err: any) {
    console.error('LinkedIn callback processing error:', err);
    return NextResponse.redirect(`${appUrl}/settings?linkedin_error=${encodeURIComponent(err.message || 'Failed to complete LinkedIn authentication')}`);
  }
}
