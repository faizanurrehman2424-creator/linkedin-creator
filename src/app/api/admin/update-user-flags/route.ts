import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId, flags } = await request.json();

    if (!userId || !flags) {
      return NextResponse.json({ error: 'Missing userId or flags' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authHeader = request.headers.get('authorization');
    const isServiceKey = authHeader && authHeader.replace('Bearer ', '') === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!user && !isServiceKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user && !isServiceKey) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!callerProfile || callerProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
      }
    }

    // Use Service Role to bypass RLS and update the target user's profile
    // If not strictly needed to bypass RLS (if RLS allows admin updates), normal client is fine.
    // However, usually profiles RLS requires service_role to update another user's profile if policy is auth.uid() = id
    // We'll try the normal client first assuming policies allow admins to update.
    // Actually, I'll instantiate a service role client to be safe.
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        can_generate_ideas: flags.can_generate_ideas,
        can_generate_images: flags.can_generate_images,
        can_generate_videos: flags.can_generate_videos
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Log the admin action
    await supabaseAdmin.from('platform_audit_logs').insert({
      user_id: user?.id || userId,
      action: 'update_user_flags',
      details: { target_user_id: userId, flags }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user flags:", error);
    return NextResponse.json({ error: error.message || 'Failed to update user flags' }, { status: 500 });
  }
}
