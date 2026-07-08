import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env file manually so we don't depend on external packages like dotenv
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index !== -1) {
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim();
        process.env[key] = val;
      }
    });
  }
} catch (err) {
  console.warn("Warning: Failed to load .env file:", err.message);
}

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;

if (!apiKey || !serviceId) {
  console.error("Error: RENDER_API_KEY and RENDER_SERVICE_ID must be set in the .env file.");
  process.exit(1);
}

async function triggerDeploy() {
  console.log(`🚀 Triggering Render "Clear Cache & Deploy" for service: ${serviceId}...`);
  try {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clearCache: 'clear'
      })
    });

    console.log(`Response Status: ${res.status} (${res.statusText})`);
    const data = await res.json();
    
    if (res.ok) {
      console.log(`✅ Success! Deployment triggered successfully.`);
      console.log(`- Deploy ID: ${data.id}`);
      console.log(`- Status: ${data.status}`);
      console.log(`- Clear Cache Option: ${data.clearCache}`);
    } else {
      console.error(`❌ API Error:`, data);
    }
  } catch (err) {
    console.error(`❌ Request failed:`, err.message);
  }
}

triggerDeploy();
