import { createAdminClient } from '@/lib/supabase/server';

export interface MasterToggles {
  idea_gen: boolean;
  image_gen: boolean;
  video_gen: boolean;
  apify: boolean;
}

export async function getMasterToggles(): Promise<MasterToggles> {
  const defaultToggles: MasterToggles = {
    idea_gen: process.env.ADMIN_IDEA_GEN_ENABLED !== 'false',
    image_gen: process.env.ADMIN_IMAGE_GEN_ENABLED !== 'false',
    video_gen: process.env.ADMIN_VIDEO_GEN_ENABLED !== 'false',
    apify: process.env.ADMIN_APIFY_ENABLED !== 'false',
  };

  try {
    const supabaseAdmin = await createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('platform_audit_logs')
      .select('details')
      .eq('action', 'master_toggles')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0 || !data[0]?.details) {
      return defaultToggles;
    }

    const saved = data[0].details as Partial<MasterToggles>;
    return {
      idea_gen: saved.idea_gen ?? defaultToggles.idea_gen,
      image_gen: saved.image_gen ?? defaultToggles.image_gen,
      video_gen: saved.video_gen ?? defaultToggles.video_gen,
      apify: saved.apify ?? defaultToggles.apify,
    };
  } catch (err) {
    console.error('Error fetching master toggles:', err);
    return defaultToggles;
  }
}

export async function setMasterToggles(toggles: MasterToggles, adminIdentifier?: string): Promise<boolean> {
  try {
    const supabaseAdmin = await createAdminClient();
    const { error } = await supabaseAdmin
      .from('platform_audit_logs')
      .insert({
        action: 'master_toggles',
        details: toggles,
        ip_address: adminIdentifier || 'admin',
      });

    if (error) {
      console.error('Failed to save master toggles:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving master toggles:', err);
    return false;
  }
}
