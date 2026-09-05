import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, getAdminTokenFromCookie } from '@/lib/admin-auth';
import { sendInvitationEmail } from '@/lib/email';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role, flags } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify admin token
    const cookieHeader = request.headers.get('cookie');
    const adminToken = getAdminTokenFromCookie(cookieHeader);
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return NextResponse.json({ error: 'Forbidden. Admin authentication required.' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a temporary password if none provided
    const tempPassword = password || `Temp${Date.now()}!`;

    // Create auth user
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || 'New Creator' }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = newAuthUser.user.id;

    // Insert or update profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName || 'New Creator',
        role: role || 'creator',
        can_generate_ideas: flags?.can_generate_ideas ?? true,
        can_generate_images: flags?.can_generate_images ?? true,
        can_generate_videos: flags?.can_generate_videos ?? false,
        timezone: 'Asia/Karachi'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Generate password-set token
    const setPasswordToken = jwt.sign(
      { userId, email, type: 'set_password' },
      process.env.ADMIN_JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const setPasswordLink = `${appUrl}/set-password?token=${setPasswordToken}`;

    // Send invitation email
    try {
      await sendInvitationEmail(email, fullName || 'New Creator', setPasswordLink);
    } catch (emailErr) {
      console.error('Invitation email failed:', emailErr);
      // User created successfully, email failed - return success with warning
    }

    // Log admin audit
    await supabaseAdmin.from('platform_audit_logs').insert({
      action: 'create_candidate_user',
      details: { target_user_id: userId, email, role: role || 'creator' }
    });

    return NextResponse.json({ success: true, user: profile });
  } catch (error: any) {
    console.error('Error creating candidate user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
