import { NextResponse } from 'next/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/admin-auth';
import { getMasterToggles, setMasterToggles, type MasterToggles } from '@/lib/system-settings';

export async function GET(request: Request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const toggles = await getMasterToggles();
    return NextResponse.json({ toggles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toggles } = await request.json();
    if (!toggles) {
      return NextResponse.json({ error: 'Missing toggles payload' }, { status: 400 });
    }

    const success = await setMasterToggles(toggles as MasterToggles, 'admin');
    if (!success) {
      return NextResponse.json({ error: 'Failed to persist master toggles' }, { status: 500 });
    }

    return NextResponse.json({ success: true, toggles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
