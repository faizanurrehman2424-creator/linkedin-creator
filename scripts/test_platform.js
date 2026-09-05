const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runPlatformTests() {
  console.log('====================================================');
  console.log('      LINKEDIN CONTENT ENGINE - PLATFORM AUDIT       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: Remote Supabase Connectivity
  try {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    assert(!pError && profiles && profiles.length >= 2, 'Supabase Database & Profiles Connected');
    console.log(`       Found ${profiles?.length || 0} registered user profile(s).`);
  } catch (e) {
    assert(false, `Supabase Database Connection: ${e.message}`);
  }

  // Test 2: Content Ideas in Database
  try {
    const { data: ideas, error: iError } = await supabase.from('content_ideas').select('*');
    assert(!iError && ideas && ideas.length > 0, `Content Ideas Pipeline (${ideas?.length || 0} ideas found)`);

    const industryCount = ideas?.filter(i => i.pillar === 'industry_trends').length || 0;
    const storytellingCount = ideas?.filter(i => i.pillar === 'recruiter_storytelling').length || 0;
    const frameworksCount = ideas?.filter(i => i.pillar === 'educational_frameworks').length || 0;

    assert(industryCount > 0, `Pillar 1 - Industry Trends: ${industryCount} ideas`);
    assert(storytellingCount > 0, `Pillar 2 - Recruiter Storytelling: ${storytellingCount} ideas`);
    assert(frameworksCount > 0, `Pillar 3 - Educational Frameworks: ${frameworksCount} ideas`);
  } catch (e) {
    assert(false, `Content Ideas Check: ${e.message}`);
  }

  // Test 3: Admin Toggle Feature Flags API
  try {
    const { data: users } = await supabase.from('profiles').select('*').eq('role', 'creator').limit(1);
    if (users && users.length > 0) {
      const targetUser = users[0];
      const initialVideoFlag = targetUser.can_generate_videos;

      const res = await fetch('http://localhost:3000/api/admin/update-user-flags', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          userId: targetUser.id,
          flags: {
            can_generate_ideas: targetUser.can_generate_ideas,
            can_generate_images: targetUser.can_generate_images,
            can_generate_videos: !initialVideoFlag
          }
        })
      });
      const resText = await res.text();
      console.log('       Update flags response:', res.status, resText);

      // Check in DB
      const { data: updated } = await supabase.from('profiles').select('can_generate_videos').eq('id', targetUser.id).single();
      assert(updated?.can_generate_videos === !initialVideoFlag, 'Admin Toggle Feature Switch Persistence');

      // Revert back
      await supabase.from('profiles').update({ can_generate_videos: initialVideoFlag }).eq('id', targetUser.id);
    } else {
      assert(false, 'No candidate user found for toggle test');
    }
  } catch (e) {
    assert(false, `Admin Toggle Flags API: ${e.message}`);
  }

  // Test 4: Quick Schedule to Calendar Flow
  try {
    const { data: freshIdeas } = await supabase.from('content_ideas').select('*').eq('status', 'fresh').limit(1);
    if (freshIdeas && freshIdeas.length > 0) {
      const testIdea = freshIdeas[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error: sError } = await supabase
        .from('content_ideas')
        .update({
          status: 'scheduled',
          scheduled_at: tomorrow.toISOString()
        })
        .eq('id', testIdea.id);

      assert(!sError, 'Post Scheduling Pipeline to Content Calendar');

      // Revert status to fresh
      await supabase.from('content_ideas').update({ status: 'fresh', scheduled_at: null }).eq('id', testIdea.id);
    }
  } catch (e) {
    assert(false, `Scheduling Test: ${e.message}`);
  }

  // Test 5: HTTP Endpoints Health Check
  const endpoints = [
    { url: 'http://localhost:3000/login', name: 'Login View' },
    { url: 'http://localhost:3000/ideas', name: 'Ideas Studio View' },
    { url: 'http://localhost:3000/users', name: 'Admin Candidate Management View' },
    { url: 'http://localhost:3000/settings', name: 'Account & Engine Settings View' },
    { url: 'http://localhost:3000/calendar', name: 'Content Calendar View' }
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url);
      assert(r.status === 200, `Route Health: ${ep.name} (Status ${r.status})`);
    } catch (e) {
      assert(false, `Route Health: ${ep.name} Failed: ${e.message}`);
    }
  }

  // Test 6: Audit Logs Table
  try {
    const { data: audit, error: aError } = await supabase.from('platform_audit_logs').select('*');
    assert(!aError, `Platform Audit Logs Active (${audit?.length || 0} entries)`);
  } catch (e) {
    assert(false, `Audit Logs Check: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runPlatformTests();
