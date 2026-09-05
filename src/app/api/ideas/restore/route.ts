import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Resolve user
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ideaId } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: 'Idea ID is required' }, { status: 400 });
    }

    // Fetch the trashed idea via admin client to bypass RLS
    const { data: idea, error: fetchError } = await adminSupabase
      .from('content_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', userId)
      .eq('status', 'trashed')
      .single();

    if (fetchError || !idea) {
      return NextResponse.json({ error: 'Trashed idea not found' }, { status: 404 });
    }

    // Check 24h window
    if (idea.trashed_at) {
      const trashedAt = new Date(idea.trashed_at);
      const now = new Date();
      const diffHours = (now.getTime() - trashedAt.getTime()) / (1000 * 60 * 60);

      if (diffHours > 24) {
        return NextResponse.json({ error: 'Restoration window (24 hours) has expired' }, { status: 410 });
      }
    }

    // Restore to fresh status via admin client
    const { error: updateError } = await adminSupabase
      .from('content_ideas')
      .update({
        status: 'fresh',
        trashed_at: null,
      })
      .eq('id', ideaId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
