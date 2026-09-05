import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/admin-auth';

async function resolveUserId(request: Request, adminSupabase: any, supabase: any): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user } } = await adminSupabase.auth.getUser(token);
      if (user?.id) return user.id;
    } catch (e) {
      // Fallback to anon client
    }
    try {
      const { data: { user: anonUser } } = await supabase.auth.getUser(token);
      if (anonUser?.id) return anonUser.id;
    } catch (e) {
      // Ignore
    }
  }

  // Try cookie-based Supabase user
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (e) {
    // Ignore
  }

  // Fallback to admin token cookie
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    if (adminToken && verifyAdminToken(adminToken)) {
      const url = new URL(request.url);
      const queryUser = url.searchParams.get('userId');
      if (queryUser) return queryUser;

      const { data: adminProf } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      if (adminProf?.id) return adminProf.id;
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

// GET /api/ideas?status=fresh&targetDate=2026-09-05
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    const userId = await resolveUserId(request, adminSupabase, supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'fresh';
    const targetDate = url.searchParams.get('targetDate');

    const month = url.searchParams.get('month');

    let query = adminSupabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      if (status.includes(',')) {
        const statusList = status.split(',').map(s => s.trim()).filter(Boolean);
        query = query.in('status', statusList);
      } else {
        query = query.eq('status', status);
      }
    }

    if (targetDate && targetDate !== 'all') {
      query = query.eq('target_date', targetDate);
    } else if (month) {
      query = query.gte('target_date', `${month}-01`).lte('target_date', `${month}-31`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('fetchIdeas error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: data || [] });
  } catch (err: any) {
    console.error('GET /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/ideas — update status or fields on a single idea
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    const userId = await resolveUserId(request, adminSupabase, supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ideaId, updates } = body;

    if (!ideaId || !updates) {
      return NextResponse.json({ error: 'ideaId and updates are required' }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from('content_ideas')
      .update(updates)
      .eq('id', ideaId)
      .eq('user_id', userId);

    if (error) {
      console.error('PATCH /api/ideas error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/ideas?ideaId=xxx
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    const userId = await resolveUserId(request, adminSupabase, supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const ideaId = url.searchParams.get('ideaId');
    const ideaIds = url.searchParams.get('ideaIds');

    if (!ideaId && !ideaIds) {
      return NextResponse.json({ error: 'ideaId or ideaIds param required' }, { status: 400 });
    }

    if (ideaIds) {
      const ids = ideaIds.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await adminSupabase
        .from('content_ideas')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await adminSupabase
        .from('content_ideas')
        .delete()
        .eq('id', ideaId!)
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
