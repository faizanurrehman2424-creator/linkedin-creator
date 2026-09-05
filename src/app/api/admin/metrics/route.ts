import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, getAdminTokenFromCookie } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    // Verify admin
    const cookieHeader = request.headers.get('cookie');
    const token = getAdminTokenFromCookie(cookieHeader);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total ideas
    const { count: totalIdeas } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true });

    // Get ideas with images
    const { count: totalImages } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('media_type', 'image');

    // Get ideas with videos
    const { count: totalVideos } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('media_type', 'video');

    // Get posted count
    const { count: totalPosted } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // Get scheduled count
    const { count: totalScheduled } = await supabase
      .from('content_ideas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    // Get pending password reset requests
    const { count: pendingResets } = await supabase
      .from('password_reset_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Master toggle states
    const masterToggles = {
      ideaGeneration: process.env.ADMIN_IDEA_GEN_ENABLED !== 'false',
      imageGeneration: process.env.ADMIN_IMAGE_GEN_ENABLED !== 'false',
      videoGeneration: process.env.ADMIN_VIDEO_GEN_ENABLED !== 'false',
      apifyEnabled: process.env.ADMIN_APIFY_ENABLED !== 'false',
    };

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalIdeas: totalIdeas || 0,
      totalImages: totalImages || 0,
      totalVideos: totalVideos || 0,
      totalPosted: totalPosted || 0,
      totalScheduled: totalScheduled || 0,
      pendingResets: pendingResets || 0,
      masterToggles,
    });
  } catch (error: any) {
    console.error('Metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
