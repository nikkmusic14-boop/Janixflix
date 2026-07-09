import fs from 'node:fs';
import path from 'node:path';

const envPath = '.env';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index !== -1) {
      process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
  });
}

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;

async function check() {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=1`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await res.json();
  console.log('Deploy Status:', data[0].deploy.status);
}
check();
