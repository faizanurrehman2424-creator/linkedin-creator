const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

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

console.log('Testing Google Gen AI initialization...');
console.log('GOOGLE_CLOUD_PROJECT:', env.GOOGLE_CLOUD_PROJECT);

const ai = new GoogleGenAI(
  env.GOOGLE_CLOUD_PROJECT
    ? { vertexai: true, project: env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' }
    : { apiKey: env.GEMINI_API_KEY }
);

async function testAI() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly: "AI connection successful."',
    });
    console.log('AI Response:', res.text);
  } catch (err) {
    console.error('AI Call Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

testAI();
