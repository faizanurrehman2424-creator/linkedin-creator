import { NextResponse } from 'next/server';
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getMasterToggles } from '@/lib/system-settings';

export async function POST(request: Request) {
  try {
    // Check dynamic master toggle
    const masterToggles = await getMasterToggles();
    if (!masterToggles.apify) {
      return NextResponse.json({ error: 'Apify scraping is currently disabled by the administrator.' }, { status: 403 });
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
      const supabase = await createServerClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      if (cookieUser) user = cookieUser;
    }

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

    const fallbackEnrichment = async (url: string) => {
      const slug = url.split('/in/')[1]?.replace(/\/.*$/, '') || 'professional';
      const cleanName = slug.replace(/[-_]/g, ' ').replace(/\d+/g, '').trim() || 'Professional';

      try {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI(
          process.env.GOOGLE_CLOUD_PROJECT
            ? { vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' }
            : { apiKey: process.env.GEMINI_API_KEY }
        );

        const enrichSchema = {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: "Professional executive headline." },
            industry: { type: Type.STRING, description: "Primary industry or market niche." },
            target_audience: { type: Type.STRING, description: "Key audience profile." },
            core_pillars: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 3 relevant content pillars."
            },
            tone_of_voice: { type: Type.STRING, description: "Suggested posting tone." }
          },
          required: ["headline", "industry", "target_audience", "core_pillars", "tone_of_voice"]
        };

        const prompt = `
          Analyze this LinkedIn profile handle or URL: "${url}" (identified name/slug: "${cleanName}").
          Infer the most probable high-impact professional profile, niche, target audience, and 3 strategic LinkedIn content pillars.
          Do NOT use any emojis.
          Return clean JSON conforming to the schema.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: enrichSchema,
            temperature: 0.7,
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return {
            headline: parsed.headline || `${cleanName} - LinkedIn Professional`,
            target_audience: parsed.target_audience || `${parsed.industry || 'B2B'} Leaders & Professionals`,
            tone_of_voice: parsed.tone_of_voice || 'professional',
            core_pillars: Array.isArray(parsed.core_pillars) && parsed.core_pillars.length >= 3 
              ? parsed.core_pillars.slice(0, 3) 
              : ['Industry Insights', 'Strategic Execution', 'Leadership Lessons'],
            industry: parsed.industry || 'Technology',
            scraped: true,
            source: 'ai_enriched'
          };
        }
      } catch (aiErr) {
        console.warn('AI profile enrichment error:', aiErr);
      }

      return {
        headline: `${cleanName} - LinkedIn Professional`,
        target_audience: 'B2B Professionals & Decision Makers',
        tone_of_voice: 'professional',
        core_pillars: ['Industry Trends', 'Tactical Lessons', 'Operational Frameworks'],
        industry: 'Professional Services',
        scraped: false,
        source: 'basic_fallback'
      };
    };

    if (!runResponse.ok) {
      const enriched = await fallbackEnrichment(linkedinUrl);
      if (enriched.scraped) {
        await adminSupabase.from('profiles').update(enriched).eq('id', user.id);
      }
      return NextResponse.json({ profile: enriched, source: enriched.source });
    }

    const runData = await runResponse.json();
    const datasetId = runData?.data?.defaultDatasetId;

    if (!datasetId) {
      const enriched = await fallbackEnrichment(linkedinUrl);
      return NextResponse.json({ profile: enriched, source: enriched.source });
    }

    // Wait briefly and fetch results
    await new Promise((resolve) => setTimeout(resolve, 8000));

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
        scraped: true,
        source: 'apify'
      };

      await adminSupabase
        .from('profiles')
        .update(contextData)
        .eq('id', user.id);

      return NextResponse.json({ profile: contextData, scraped: true, source: 'apify' });
    }

    const enriched = await fallbackEnrichment(linkedinUrl);
    return NextResponse.json({ profile: enriched, source: enriched.source });
  } catch (error: any) {
    console.error('Apify scrape error:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}
