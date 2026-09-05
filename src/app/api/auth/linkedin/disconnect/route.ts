import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const adminSupabase = await createAdminClient();
    let userId: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await adminSupabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        linkedin_connected: false,
        linkedin_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LinkedIn disconnect error:', error);
    return NextResponse.json({ error: error.message || 'Failed to disconnect LinkedIn' }, { status: 500 });
  }
}
