import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/admin-auth';
import { sendPasswordResetEmail } from '@/lib/email';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('password_reset_requests')
      .select(`
        id,
        user_id,
        email,
        status,
        created_at,
        resolved_at,
        profiles!password_reset_requests_user_id_fkey (
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests: data || [] });
  } catch (error: any) {
    console.error('Password requests error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminToken = getAdminTokenFromRequest(request);
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, action } = await request.json();

    if (!requestId || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'decline') {
      await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', requestId);

      return NextResponse.json({ success: true, action: 'declined' });
    }

    // Approve: get request details
    const { data: resetRequest } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!resetRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Generate a password reset token
    const resetToken = jwt.sign(
      { userId: resetRequest.user_id, email: resetRequest.email, type: 'password_reset' },
      process.env.ADMIN_JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const resetLink = `${appUrl}/set-password?token=${resetToken}&type=reset`;

    // Send email
    try {
      await sendPasswordResetEmail(resetRequest.email, resetLink);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      // Still mark as approved even if email fails
    }

    // Update request status
    await supabase
      .from('password_reset_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', requestId);

    return NextResponse.json({ success: true, action: 'approved' });
  } catch (error: any) {
    console.error('Password request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
