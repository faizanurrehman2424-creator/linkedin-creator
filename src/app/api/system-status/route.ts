import { NextResponse } from 'next/server';
import { getMasterToggles } from '@/lib/system-settings';

export async function GET() {
  try {
    const toggles = await getMasterToggles();
    return NextResponse.json({
      success: true,
      idea_gen: toggles.idea_gen,
      image_gen: toggles.image_gen,
      video_gen: toggles.video_gen,
      apify: toggles.apify,
      features: toggles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
