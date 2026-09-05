import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

// Helper to determine the caller's identity
async function getAuthenticatedUser(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  
  // 1. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      return { type: 'user' as const, userId: user.id, email: user.email };
    }
  }

  // 2. Try Supabase Auth session via cookies
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return { type: 'user' as const, userId: user.id, email: user.email };
  }

  // 3. Try Admin JWT cookie
  const adminToken = cookieStore.get('admin_token')?.value;
  if (adminToken) {
    const verified = verifyAdminToken(adminToken);
    if (verified) {
      return { type: 'admin' as const, adminName: verified.name };
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = await createAdminClient();

    let query = adminSupabase.from('profiles').select('*');

    if (auth.type === 'user') {
      query = query.eq('id', auth.userId);
    } else {
      // Admin session: fetch admin profile
      query = query.eq('role', 'admin').limit(1);
    }

    const { data: profile, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }

    if (!profile && auth.type === 'admin') {
      // If no admin profile exists yet, return default admin info
      return NextResponse.json({
        profile: {
          email: 'admin@system.local',
          role: 'admin',
          full_name: auth.adminName || 'System Administrator',
          timezone: 'Asia/Karachi',
          can_generate_ideas: true,
          can_generate_images: true,
          can_generate_videos: true,
          core_pillars: ['Industry Trends', 'Thought Leadership', 'Executive Growth'],
          tone_of_voice: 'professional',
        }
      });
    }

    if (!profile) {
      if (auth.type === 'user') {
        const { data: newProfile, error: insertError } = await adminSupabase
          .from('profiles')
          .upsert({
            id: auth.userId,
            email: auth.email || 'creator@example.com',
            role: 'creator',
            full_name: 'Creator',
            timezone: 'Asia/Karachi',
            can_generate_ideas: true,
            can_generate_images: true,
            can_generate_videos: true,
            headline: 'Content Creator & Thought Leader',
            target_audience: 'B2B Professionals & Founders',
            tone_of_voice: 'professional',
            core_pillars: ['Industry Trends', 'Actionable Insights', 'Personal Growth'],
          }, { onConflict: 'id' })
          .select()
          .single();

        if (newProfile && !insertError) {
          return NextResponse.json({ profile: newProfile });
        }
      }

      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      full_name,
      timezone,
      headline,
      target_audience,
      tone_of_voice,
      core_pillars
    } = body;

    const adminSupabase = await createAdminClient();

    // Sanitize pillars array
    const sanitizedPillars = Array.isArray(core_pillars)
      ? core_pillars.map((p: any) => String(p || '').trim()).filter(Boolean)
      : null;

    const updatePayload: Record<string, any> = {
      full_name: full_name !== undefined ? full_name : undefined,
      timezone: timezone || 'Asia/Karachi',
      headline: headline !== undefined ? headline : null,
      target_audience: target_audience !== undefined ? target_audience : null,
      tone_of_voice: tone_of_voice || 'professional',
      core_pillars: sanitizedPillars && sanitizedPillars.length > 0 ? sanitizedPillars : null,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updatePayload).forEach(
      (key) => updatePayload[key] === undefined && delete updatePayload[key]
    );

    let targetId = auth.type === 'user' ? auth.userId : null;

    if (!targetId) {
      // Find admin profile
      const { data: adminProf } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminProf?.id) {
        targetId = adminProf.id;
      }
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Profile ID could not be determined' }, { status: 400 });
    }

    let { data: updatedProfile, error: updateError } = await adminSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetId)
      .select()
      .maybeSingle();

    if (!updatedProfile) {
      const { data: upsertedProfile, error: upsertErr } = await adminSupabase
        .from('profiles')
        .upsert({
          id: targetId,
          role: auth.type === 'admin' ? 'admin' : 'creator',
          ...updatePayload,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) {
        console.error('Failed to upsert profile:', upsertErr);
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
      updatedProfile = upsertedProfile;
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Settings updated successfully'
    });
  } catch (err: any) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
