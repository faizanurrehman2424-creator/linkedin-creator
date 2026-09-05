import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = await createAdminClient();
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        linkedin_connected: false,
        linkedin_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LinkedIn disconnect error:', error);
    return NextResponse.json({ error: error.message || 'Failed to disconnect LinkedIn' }, { status: 500 });
  }
}
