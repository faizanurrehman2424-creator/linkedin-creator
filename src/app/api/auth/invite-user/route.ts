import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, role, fullName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify caller is admin
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Use admin client to invite
    const supabaseAdmin = await createAdminClient();
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
