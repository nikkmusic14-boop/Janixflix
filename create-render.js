

const TOKEN = 'rnd_qqNX52F50Dcr5QDDB5CkkQBseGK0';
const OWNER_ID = 'tea-d98h8plaeets73fvdnhg';
const REPO = 'https://github.com/nikkmusic14-boop/Janixflix';

async function createService(payload) {
  const res = await fetch('https://api.render.com/v1/services', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Failed to create ${payload.name}:`, data);
  } else {
    console.log(`Created ${payload.name}: ${data.service.serviceDetails.url}`);
  }
}

async function run() {
  // Create Backend
  await createService({
    type: 'web_service',
    name: 'Janixflix-1',
    ownerId: OWNER_ID,
    repo: REPO,
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: 'server',
    serviceDetails: {
      plan: 'free',
      env: 'node',
      region: 'oregon',
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'npm start'
      }
    }
  });

  // Create Frontend as Static Site (100GB Free!)
  /*
  await createService({
    type: 'static_site',
    name: 'Janixflix',
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
  */
}

run();
