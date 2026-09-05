import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { publishToLinkedIn, fetchLinkedInUserInfo } from '@/lib/linkedin';

export async function POST(request: Request) {
  try {
    const adminSupabase = await createAdminClient();
    let user: any = null;

    // Check Bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: tokenUser } } = await adminSupabase.auth.getUser(token);
      if (tokenUser) user = tokenUser;
    }

    // Check cookies
    if (!user) {
      const supabase = await createClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      if (cookieUser) user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { ideaId, customText, hookIndex } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: 'ideaId is required' }, { status: 400 });
    }

    // Fetch user profile to verify LinkedIn integration
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.linkedin_connected || !profile.linkedin_access_token) {
      return NextResponse.json({ 
        error: 'LinkedIn account is not connected. Please connect your LinkedIn account in Settings first.' 
      }, { status: 400 });
    }

    // Fetch the target idea
    const { data: idea, error: ideaError } = await adminSupabase
      .from('content_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 });
    }

    // Build the post text
    let postText = customText;
    if (!postText) {
      const selectedIndex = hookIndex !== undefined ? hookIndex : (idea.selected_hook_index || 0);
      const hook = (idea.hook_options && idea.hook_options[selectedIndex]) || '';
      const body = idea.caption_body || '';
      const tags = Array.isArray(idea.hashtags) ? idea.hashtags.join(' ') : '';
      postText = `${hook}\n\n${body}\n\n${tags}`.trim();
    }

    if (!postText) {
      return NextResponse.json({ error: 'Post content is empty' }, { status: 400 });
    }

    // Get author URN from LinkedIn API
    let authorUrn = '';
    try {
      const userInfo = await fetchLinkedInUserInfo(profile.linkedin_access_token);
      authorUrn = userInfo.sub;
    } catch (authErr: any) {
      console.error('Failed to verify LinkedIn token:', authErr);
      return NextResponse.json({ 
        error: 'LinkedIn session expired. Please reconnect your LinkedIn account in Settings.' 
      }, { status: 401 });
    }

    // Publish to LinkedIn
    const publishResult = await publishToLinkedIn(
      profile.linkedin_access_token,
      authorUrn,
      postText
    );

    if (!publishResult.success) {
      return NextResponse.json({ 
        error: publishResult.error || 'Failed to publish post to LinkedIn' 
      }, { status: 502 });
    }

    // Update post status in database
    const supabaseAdmin = await createAdminClient();
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from('content_ideas')
      .update({
        status: 'published',
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', ideaId);

    // Record step history
    await supabaseAdmin
      .from('idea_step_history')
      .insert({
        idea_id: ideaId,
        user_id: user.id,
        action: 'published_to_linkedin',
        metadata: {
          post_urn: publishResult.postUrn,
          post_url: publishResult.postUrl,
          published_at: nowIso,
        },
      });

    return NextResponse.json({
      success: true,
      postUrl: publishResult.postUrl,
      postUrn: publishResult.postUrn,
    });
  } catch (error: any) {
    console.error('LinkedIn publish error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while publishing' }, { status: 500 });
  }
}
