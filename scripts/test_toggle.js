const fs = require('fs');
const path = require('path');

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

async function testToggle() {
  const res = await fetch('http://localhost:3000/api/admin/update-user-flags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      userId: 'e32fddcf-bb54-4ab3-b8a7-a6f5222cfa0f',
      flags: {
        can_generate_ideas: true,
        can_generate_images: true,
        can_generate_videos: true
      }
    })
  });

  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

testToggle();
