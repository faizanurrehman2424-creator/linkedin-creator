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

    // Fetch auth users to get ban status
    const authUsersMap: Record<string, any> = {};
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (authData?.users) {
        for (const au of authData.users) {
          authUsersMap[au.id] = au;
        }
      }
    } catch (authErr) {
      console.warn('Could not list auth users:', authErr);
    }

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

    const enrichedUsers = (users || []).map(u => {
      const authUser = authUsersMap[u.id];
      const isBanned = authUser?.banned_until ? new Date(authUser.banned_until) > new Date() : false;
      const isActive = u.is_active !== undefined && u.is_active !== null ? Boolean(u.is_active) : !isBanned;

      return {
        ...u,
        is_active: isActive,
        ideas_count: ideasByUser[u.id]?.total || 0,
        images_count: ideasByUser[u.id]?.images || 0,
        videos_count: ideasByUser[u.id]?.videos || 0,
        published_count: ideasByUser[u.id]?.published || 0,
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isActive } = await request.json();

    if (!userId || isActive === undefined) {
      return NextResponse.json({ error: 'Missing userId or isActive state' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update Supabase Auth user ban status so login is blocked / allowed immediately
    try {
      if (isActive) {
        await supabase.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
          user_metadata: { is_active: true },
          app_metadata: { is_active: true }
        });
      } else {
        await supabase.auth.admin.updateUserById(userId, {
          ban_duration: '876000h',
          user_metadata: { is_active: false },
          app_metadata: { is_active: false }
        });
      }
    } catch (banErr: any) {
      console.warn('Supabase auth ban update error:', banErr);
    }

    // 2. Also attempt to update profiles table if column exists
    try {
      await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
    } catch (profErr) {
      // Ignore if is_active column does not exist on profiles
    }

    return NextResponse.json({ success: true, is_active: isActive });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
