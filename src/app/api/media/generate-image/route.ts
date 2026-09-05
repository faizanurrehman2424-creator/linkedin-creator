import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMasterToggles } from '@/lib/system-settings';

export async function POST(request: Request) {
  try {
    // Check global master switch
    const masterToggles = await getMasterToggles();
    if (!masterToggles.image_gen) {
      return NextResponse.json({ error: 'AI Image generation is temporarily disabled by administrator.' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('can_generate_images')
      .eq('id', user.id)
      .single();

    if (profile && profile.can_generate_images === false) {
      return NextResponse.json({ error: 'Image generation is disabled for your account by the administrator.' }, { status: 403 });
    }

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Generate high-definition visual
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=1200&nologo=true&enhance=true`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
  }
}
