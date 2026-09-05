import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Check master toggle
    if (process.env.ADMIN_APIFY_ENABLED === 'false') {
      return NextResponse.json({ error: 'Apify scraping is currently disabled by the administrator.' }, { status: 403 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedinUrl } = await request.json();

    if (!linkedinUrl) {
      return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
    }

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Apify API key not configured' }, { status: 500 });
    }

    // Run the Apify LinkedIn profile scraper
    const actorId = 'curious_coder~linkedin-profile-scraper';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`;

    const runResponse = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: linkedinUrl }],
        proxyConfiguration: { useApifyProxy: true },
      }),
    });

    if (!runResponse.ok) {
      // Fallback: extract basic info from the URL
      const username = linkedinUrl.split('/in/')[1]?.replace(/\//g, '') || 'professional';
      return NextResponse.json({
        profile: {
          headline: `${username} - LinkedIn Professional`,
          summary: 'Experienced professional active on LinkedIn.',
          scraped: false,
        },
      });
    }

    const runData = await runResponse.json();
    const datasetId = runData?.data?.defaultDatasetId;

    if (!datasetId) {
      return NextResponse.json({
        profile: {
          headline: 'LinkedIn Professional',
          summary: 'Profile data will be available after scraping completes.',
          scraped: false,
        },
      });
    }

    // Wait briefly and fetch results
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`;
    const dataResponse = await fetch(dataUrl);
    const items = await dataResponse.json();

    if (items && items.length > 0) {
      const profile = items[0];
      const contextData = {
        headline: profile.headline || '',
        target_audience: profile.industry || '',
        tone_of_voice: 'professional',
        core_pillars: [profile.industry || 'Technology', 'Leadership', 'Innovation'],
        sample_posts: [],
      };

      // Save to user profile
      await supabase
        .from('profiles')
        .update(contextData)
        .eq('id', user.id);

      return NextResponse.json({ profile: contextData, scraped: true });
    }

    return NextResponse.json({
      profile: {
        headline: 'LinkedIn Professional',
        summary: 'Scraping in progress. Data will be available shortly.',
        scraped: false,
      },
    });
  } catch (error: any) {
    console.error('Apify scrape error:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}
