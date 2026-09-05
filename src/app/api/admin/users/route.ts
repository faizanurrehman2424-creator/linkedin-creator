import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate idea and media counts per user
    const { data: allIdeas } = await supabase
      .from('content_ideas')
      .select('user_id, media_type, status');

    const ideasByUser: Record<string, { total: number; images: number; videos: number; published: number }> = {};
    if (allIdeas) {
      for (const idea of allIdeas) {
        if (!ideasByUser[idea.user_id]) {
          ideasByUser[idea.user_id] = { total: 0, images: 0, videos: 0, published: 0 };
        }
        ideasByUser[idea.user_id].total++;
        if (idea.media_type === 'image') ideasByUser[idea.user_id].images++;
        if (idea.media_type === 'video') ideasByUser[idea.user_id].videos++;
        if (idea.status === 'published') ideasByUser[idea.user_id].published++;
      }
    }

    const enrichedUsers = (users || []).map(u => ({
      ...u,
      ideas_count: ideasByUser[u.id]?.total || 0,
      images_count: ideasByUser[u.id]?.images || 0,
      videos_count: ideasByUser[u.id]?.videos || 0,
      published_count: ideasByUser[u.id]?.published || 0,
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
