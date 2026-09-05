import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    const adminName = process.env.ADMIN_NAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // identifier can be the admin name or email
    const isValidName = identifier?.toLowerCase() === adminName.toLowerCase();
    const isValidPassword = password === adminPassword;

    if (!isValidName || !isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    const token = signAdminToken();

    const response = NextResponse.json({ success: true, name: adminName });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
