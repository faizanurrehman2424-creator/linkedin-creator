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

async function testGenerate() {
  console.log('Testing idea generation in database...');
  // Find admin user
  const { data: profiles } = await supabase.from('profiles').select('*').eq('email', 'admin@example.com');
  if (!profiles || profiles.length === 0) {
    console.error('Admin profile not found');
    return;
  }
  const admin = profiles[0];
  console.log('Admin user found:', admin.id);

  // Check if ideas exist
  const { data: existingIdeas } = await supabase.from('content_ideas').select('id').eq('user_id', admin.id);
  console.log('Existing ideas for admin:', existingIdeas?.length || 0);

  if (!existingIdeas || existingIdeas.length === 0) {
    console.log('Seeding initial 15 ideas for admin...');
    const today = new Date().toISOString().split('T')[0];
    
    // We can call the API or insert structured batch
    const res = await fetch('http://localhost:3000/api/ideas/generate-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate: today })
    });
    const result = await res.json();
    console.log('API call result (without session):', result);
  }
}

testGenerate();
