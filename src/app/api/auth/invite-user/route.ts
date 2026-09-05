import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { email, role, fullName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = await createAdminClient();
    const adminToken = getAdminTokenFromRequest(request);
    const isAdminJwt = Boolean(adminToken && verifyAdminToken(adminToken));

    let isAllowed = isAdminJwt;
    if (!isAllowed) {
      let user: any = null;
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token);
        if (tokenUser) user = tokenUser;
      }
      if (!user) {
        const supabaseUser = await createClient();
        const { data: { user: cookieUser } } = await supabaseUser.auth.getUser();
        if (cookieUser) user = cookieUser;
      }

      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Use admin client to invite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName || '',
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Note: The profiles table row will either be created by a Supabase trigger 
    // on auth.users insert, or we can insert it manually here if no trigger exists.
    // For simplicity, we'll ensure the profile row is present.
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          role: role === 'admin' ? 'admin' : 'creator',
          full_name: fullName || '',
        })
        .select()
        .single();
        
      if (profileError && profileError.code !== '23505') { // Ignore unique violation if trigger handled it
        console.error("Error creating profile:", profileError);
      }
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
