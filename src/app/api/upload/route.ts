import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = await createAdminClient();
    let user: any = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: tokenUser } } = await adminSupabase.auth.getUser(token);
      if (tokenUser) user = tokenUser;
    }

    if (!user) {
      const supabase = await createServerClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      if (cookieUser) user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data, error } = await adminSupabase.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      // If storage bucket doesn't exist, return a data URL fallback
      console.error('Storage upload error:', error);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl, source: 'inline' });
    }

    const { data: publicUrl } = adminSupabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl.publicUrl, source: 'storage' });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
