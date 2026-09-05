import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { userId, flags } = await request.json();

    if (!userId || !flags) {
      return NextResponse.json({ error: 'Missing userId or flags' }, { status: 400 });
    }

    const adminToken = getAdminTokenFromRequest(request);
    const isAdmin = adminToken && verifyAdminToken(adminToken);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authHeader = request.headers.get('authorization');
    const isServiceKey = authHeader && authHeader.replace('Bearer ', '') === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isAdmin && !user && !isServiceKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (user && !isServiceKey && !isAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!callerProfile || callerProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
      }
    }



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
