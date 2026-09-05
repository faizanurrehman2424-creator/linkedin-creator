import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = await createAdminClient();
    
    // First, lookup the user profile to ensure they exist
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // Return a generic success to prevent email enumeration attacks
      return NextResponse.json({ success: true, message: 'If the email exists, a reset request was created.' });
    }

    // Insert into password_reset_requests
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({
        user_id: profile.id,
        email: email,
        status: 'pending'
      });

    if (insertError) {
      console.error("Error creating reset request:", insertError);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset request was created.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
