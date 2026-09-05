import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    const adminName = process.env.ADMIN_NAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || '';

    // identifier can be the admin name, 'admin', or admin email
    const cleanId = (identifier || '').trim().toLowerCase();
    const isValidName =
      cleanId === adminName.toLowerCase() ||
      cleanId === 'admin' ||
      (Boolean(adminEmail) && cleanId === adminEmail.toLowerCase());
    const isValidPassword = password === adminPassword;

    if (!isValidName || !isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    const token = signAdminToken();

    // Check if the connection is HTTPS
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');

    const response = NextResponse.json({ success: true, name: adminName, token });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: isHttps,
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
