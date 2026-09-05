import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ideaId } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: 'Idea ID is required' }, { status: 400 });
    }

    // Check if the idea is trashed and within 24h window
    const { data: idea, error: fetchError } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
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

    // Restore to fresh status
    const { error: updateError } = await supabase
      .from('content_ideas')
      .update({
        status: 'fresh',
        trashed_at: null,
      })
      .eq('id', ideaId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
