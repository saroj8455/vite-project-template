import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const apiHealthUrl = 'http://127.0.0.1:8011/api/health';
const timeoutMs = 30000;
const retryMs = 250;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const viteEntry = resolve(scriptDirectory, '../node_modules/vite/bin/vite.js');

async function waitForApi() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(apiHealthUrl);
      if (response.ok) return;
    } catch {
      // The API is still connecting to MongoDB.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, retryMs));
  }
  throw new Error('API did not become ready within 30 seconds. Check the [server] logs.');
}

try {
  console.log('Waiting for API readiness...');
  await waitForApi();
  console.log('API ready; starting Vite.');
  const vite = spawn(process.execPath, [viteEntry], { stdio: 'inherit' });
  vite.on('exit', (code) => process.exit(code ?? 0));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => vite.kill(signal));
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
