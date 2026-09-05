import { NextResponse } from 'next/server';
import { getMasterToggles } from '@/lib/system-settings';

export async function GET() {
  try {
    const toggles = await getMasterToggles();
    return NextResponse.json({
      success: true,
      features: toggles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
