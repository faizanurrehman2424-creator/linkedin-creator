import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'lce-admin-jwt-secret-change-in-prod';

export function signAdminToken(): string {
  return jwt.sign(
    { role: 'admin', name: process.env.ADMIN_NAME || 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyAdminToken(token: string): { role: string; name: string } | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { role: string; name: string };
    if (decoded.role === 'admin') return decoded;
    return null;
  } catch {
    return null;
  }
}

export function getAdminTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

export function getAdminTokenFromRequest(request: Request): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (match) return match[1].trim();
  }

  return null;
}
