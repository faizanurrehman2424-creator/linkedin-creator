import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { publishToLinkedIn, fetchLinkedInUserInfo } from '@/lib/linkedin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const bearerSecret = authHeader?.replace('Bearer ', '');

    const expectedSecret = process.env.CRON_SECRET || 'lce-cron-secret-key-2024';

    // Verify cron authorization secret
    if (secretParam !== expectedSecret && bearerSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }

    const supabaseAdmin = await createAdminClient();
    const nowIso = new Date().toISOString();

    // Query all scheduled posts whose scheduled_at timestamp has passed
    const { data: scheduledIdeas, error: fetchError } = await supabaseAdmin
      .from('content_ideas')
      .select('*, profiles(id, linkedin_connected, linkedin_access_token, full_name)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso);

    if (fetchError) {
      console.error('Failed to fetch scheduled ideas:', fetchError);
      throw fetchError;
    }

    if (!scheduledIdeas || scheduledIdeas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled posts due for publishing.',
        processed: 0,
      });
    }

    const results = [];

    for (const idea of scheduledIdeas) {
      const profile = (idea as any).profiles;

      if (!profile || !profile.linkedin_connected || !profile.linkedin_access_token) {
        results.push({
          ideaId: idea.id,
          status: 'skipped',
          reason: 'User has no connected LinkedIn account',
        });
        continue;
      }

      // Format post content
      const selectedIndex = idea.selected_hook_index || 0;
      const hook = (idea.hook_options && idea.hook_options[selectedIndex]) || '';
      const body = idea.caption_body || '';
      const tags = Array.isArray(idea.hashtags) ? idea.hashtags.join(' ') : '';
      const postText = `${hook}\n\n${body}\n\n${tags}`.trim();

      try {
        const userInfo = await fetchLinkedInUserInfo(profile.linkedin_access_token);
        const authorUrn = userInfo.sub;

        const publishResult = await publishToLinkedIn(
          profile.linkedin_access_token,
          authorUrn,
          postText
        );

        if (publishResult.success) {
          await supabaseAdmin
            .from('content_ideas')
            .update({
              status: 'published',
              published_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', idea.id);

          await supabaseAdmin
            .from('idea_step_history')
            .insert({
              idea_id: idea.id,
              user_id: idea.user_id,
              action: 'published_via_automated_cron',
              metadata: {
                post_urn: publishResult.postUrn,
                post_url: publishResult.postUrl,
                scheduled_at: idea.scheduled_at,
                published_at: nowIso,
              },
            });

          results.push({
            ideaId: idea.id,
            status: 'published',
            postUrl: publishResult.postUrl,
          });
        } else {
          results.push({
            ideaId: idea.id,
            status: 'failed',
            error: publishResult.error,
          });
        }
      } catch (postErr: any) {
        console.error(`Publish failed for idea ${idea.id}:`, postErr);
        results.push({
          ideaId: idea.id,
          status: 'error',
          error: postErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: scheduledIdeas.length,
      results,
    });
  } catch (error: any) {
    console.error('Publish scheduled cron error:', error);
    return NextResponse.json({ error: error.message || 'Scheduled publishing cron failed' }, { status: 500 });
  }
}
