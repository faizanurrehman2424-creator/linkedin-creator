const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file
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

async function main() {
  console.log('--- Checking Supabase Profiles ---');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log('Current Profiles in database:', JSON.stringify(profiles, null, 2));
  }

  console.log('--- Checking Auth Users ---');
  const { data: authData, error: aError } = await supabase.auth.admin.listUsers();
  if (aError) {
    console.error('Error listing auth users:', aError);
  } else {
    console.log('Auth Users count:', authData.users.length);
    authData.users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}`));
  }
}

main();
