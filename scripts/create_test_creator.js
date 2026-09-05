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

async function createCandidateUser() {
  const email = 'creator@example.com';
  const password = 'Password123!';
  const fullName = 'Alex Rivera (Creator)';

  console.log(`Creating test creator user: ${email}...`);

  // Check if user exists in auth
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error checking users:', listError);
    return;
  }

  let user = listData.users.find(u => u.email === email);

  if (!user) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return;
    }
    user = newUser.user;
    console.log('Created auth user with ID:', user.id);
  } else {
    console.log('Auth user already exists with ID:', user.id);
  }

  // Upsert profile in public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: email,
      full_name: fullName,
      role: 'creator',
      can_generate_ideas: true,
      can_generate_images: true,
      can_generate_videos: false,
      timezone: 'Asia/Karachi',
      tone_of_voice: 'Direct, insightful, and executive',
      core_pillars: ['Thought Leadership', 'Industry Insights', 'Recruiting Strategies']
    }, { onConflict: 'id' })
    .select();

  if (profileError) {
    console.error('Error inserting profile:', profileError);
  } else {
    console.log('Profile created/updated successfully in database:');
    console.log(profile);
  }
}

createCandidateUser();
