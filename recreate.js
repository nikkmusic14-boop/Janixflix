const TOKEN = 'rnd_qqNX52F50Dcr5QDDB5CkkQBseGK0';
const OWNER_ID = 'tea-d98h8plaeets73fvdnhg';
const REPO = 'https://github.com/nikkmusic14-boop/Janixflix';

async function req(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.render.com/v1${path}`, opts);
  if (method === 'DELETE' && res.ok) return true;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function run() {
  console.log("Deleting old services...");
  try { await req('/services/srv-d98hcuutrd3s73embcu0', 'DELETE'); console.log("Deleted backend"); } catch(e){}
  try { await req('/services/srv-d98hcavaqgkc73dlaoeg', 'DELETE'); console.log("Deleted frontend"); } catch(e){}

  console.log("Waiting 10s for Render to free up the names...");
  await new Promise(r => setTimeout(r, 10000));

  console.log("Creating New Backend (janixflix-api)...");
  const backend = await req('/services', 'POST', {
    type: 'web_service',
    name: 'janixflix-api',
    ownerId: OWNER_ID,
    repo: REPO,
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: 'server',
    serviceDetails: {
      plan: 'free',
      env: 'node',
      region: 'oregon',
      envVars: [
        { key: 'TMDB_API_KEY', value: '278150143202ae8f4498e4fc0f8241e2' }
      ],
      envSpecificDetails: { buildCommand: 'npm install', startCommand: 'npm start' }
    }
  });
  
  const backendUrl = backend.service.serviceDetails.url;
  console.log("Backend URL:", backendUrl);

  console.log("Creating New Frontend (janixflix-1)...");
  const frontend = await req('/services', 'POST', {
    type: 'static_site',
    name: 'janixflix-1',
    ownerId: OWNER_ID,
    repo: REPO,
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: 'client',
    serviceDetails: {
      buildCommand: 'npm install && npm run build',
      publishPath: 'dist'
    }
  });
  
  const frontendUrl = frontend.service.serviceDetails.url;
  console.log("Frontend URL:", frontendUrl);
  
  console.log("Setting VITE_API_URL on Frontend...");
  await req(`/services/${frontend.service.id}/env-vars`, 'PUT', [
    { key: 'VITE_API_URL', value: backendUrl }
  ]);
  
  console.log("Done!");
}

run().catch(console.error);
