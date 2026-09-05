import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getMasterToggles } from '@/lib/system-settings';

export async function POST(request: Request) {
  try {
    // Check global master switch
    const masterToggles = await getMasterToggles();
    if (!masterToggles.video_gen) {
      return NextResponse.json({ error: 'AI Video generation is temporarily disabled by administrator.' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();
    let user: any = null;

    // Check Bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: tokenUser } } = await adminSupabase.auth.getUser(token);
      if (tokenUser) user = tokenUser;
    }

    // Check cookies
    if (!user) {
      const supabase = await createClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      if (cookieUser) user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Check user permissions via admin client to avoid RLS recursion
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('can_generate_videos')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.can_generate_videos === false) {
      return NextResponse.json({ error: 'Video generation is disabled for your account by the administrator.' }, { status: 403 });
    }

    const { prompt, taskId } = await request.json();

    const apiKey = process.env.VEO3_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Video generation API key is not configured on the server.' }, { status: 503 });
    }

    // Polling status of existing task
    if (taskId) {
      const statusRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      const statusData = await statusRes.json();
      const videoUrl = statusData?.data?.output?.video_url;
      const status = statusData?.data?.status;

      return NextResponse.json({
        status: status || 'processing',
        videoUrl: videoUrl || null,
        data: statusData,
      });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Submit new Veo3 video generation task
    const res = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: 'veo3',
        task_type: 'video_generation',
        input: { prompt: prompt.trim() },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Video generation service failed to start task.' }, { status: 502 });
    }

    const videoUrl = data?.data?.output?.video_url;
    const newTaskId = data?.data?.task_id;

    return NextResponse.json({
      success: true,
      taskId: newTaskId,
      videoUrl: videoUrl || null,
      status: videoUrl ? 'completed' : 'processing',
    });
  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json({ error: error.message || 'Video generation failed' }, { status: 500 });
  }
}
