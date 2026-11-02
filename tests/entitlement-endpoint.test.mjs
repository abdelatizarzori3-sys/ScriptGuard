import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 42000 + Math.floor(Math.random() * 1000);
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: repository,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let startup = '';
server.stdout.on('data', chunk => { startup += chunk.toString(); });
server.stderr.on('data', chunk => { startup += chunk.toString(); });

try {
  const deadline = Date.now() + 5_000;
  while (!startup.includes('ScriptGuard API listening') && Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Server stopped during startup: ${startup}`);
    await new Promise(resolveDelay => setTimeout(resolveDelay, 25));
  }
  assert.match(startup, /ScriptGuard API listening/, 'server should start');

  const noVerifier = await fetch(`http://127.0.0.1:${port}/api/entitlements/me?feature=aggregate-review-export`);
  assert.equal(noVerifier.status, 503);
  assert.deepEqual(await noVerifier.json(), {
    code: 'ENTITLEMENT_VERIFICATION_NOT_CONFIGURED',
    error: 'Server-side account and verified subscription integration are required before Pro exports can be enabled.'
  });

  const unsupported = await fetch(`http://127.0.0.1:${port}/api/entitlements/me?feature=client-flag`);
  assert.equal(unsupported.status, 400);
  assert.equal((await unsupported.json()).code, 'FEATURE_NOT_SUPPORTED');
  console.log('ScriptGuard entitlement endpoint fails closed as expected.');
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}
