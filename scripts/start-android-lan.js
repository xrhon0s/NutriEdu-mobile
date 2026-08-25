const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

const privateAddress = (address) => (
  address.startsWith('10.')
  || address.startsWith('192.168.')
  || /^172\.(1[6-9]|2\d|3[01])\./.test(address)
);

const findLanAddress = () => {
  const interfaces = os.networkInterfaces();
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses || [])
      .filter((address) => address.family === 'IPv4' && !address.internal && privateAddress(address.address))
      .map((address) => ({ name, address: address.address })),
  );
  return candidates.find((candidate) => candidate.name === 'en0') || candidates[0];
};

const updateApiUrl = (address) => {
  const apiUrl = `http://${address}:3002/api`;
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = current.split(/\r?\n/).filter(Boolean);
  const key = 'EXPO_PUBLIC_API_URL=';
  const index = lines.findIndex((line) => line.startsWith(key));
  if (index >= 0) lines[index] = `${key}${apiUrl}`;
  else lines.push(`${key}${apiUrl}`);
  fs.writeFileSync(envPath, `${lines.join('\n')}\n`);
  return apiUrl;
};

const checkBackend = async (apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/users/restrictions`, { signal: AbortSignal.timeout(3000) });
    return response.status === 401 || response.ok;
  } catch {
    return false;
  }
};

const run = async () => {
  const lan = findLanAddress();
  if (!lan) {
    throw new Error('No private Wi-Fi/LAN IPv4 address was found. Connect the Mac to the same Wi-Fi as Android.');
  }

  const apiUrl = updateApiUrl(lan.address);
  const backendReady = await checkBackend(apiUrl);
  const metroUrl = `http://${lan.address}:8081`;

  console.log(`\nNutriEdu Android LAN\n`);
  console.log(`Mac interface: ${lan.name}`);
  console.log(`API: ${apiUrl} (${backendReady ? 'reachable' : 'NOT reachable; start backend on port 3002'})`);
  console.log(`Android manual URL: ${metroUrl}`);
  console.log('Keep this terminal open while using the development APK.\n');

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const expo = spawn(command, ['expo', 'start', '--dev-client', '--clear'], {
    cwd: projectRoot,
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: lan.address },
    stdio: 'inherit',
  });

  expo.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
};

run().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exitCode = 1;
});
