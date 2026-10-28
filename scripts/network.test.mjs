// Verify participant isolation and fail-closed command validation without opening a wallet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
// Use an isolated project so generated secrets and notebooks never touch a learner's profile.
async function fixture(action) {
  const folder = await mkdtemp(join(tmpdir(), 'midnight-sessions-'));
  try {
    await mkdir(join(folder, 'scripts'));
    await mkdir(join(folder, 'Lessons/Lesson 13/Solution/network/build'), { recursive: true });
    for (const name of ['session-init.mjs', 'session.mjs']) await cp(join(root, 'scripts', name), join(folder, 'scripts', name));
    const invoke = (name, args, env = {}) => spawnSync(process.execPath, [join(folder, 'scripts', name), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
    await action(folder, invoke);
  } finally { await rm(folder, { recursive: true, force: true }); }
}

test('new public participants have independent secrets, private files, and no overwrite', async () => {
  await fixture(async (folder, invoke) => {
    for (const name of ['alice', 'bob']) assert.equal(invoke('session-init.mjs', ['preview', name]).status, 0);
    const file = join(folder, 'Lessons/Lesson 13/Solution/network/.env.preview.alice.local');
    const first = await readFile(file, 'utf8');
    const second = await readFile(join(folder, 'Lessons/Lesson 13/Solution/network/.env.preview.bob.local'), 'utf8');
    assert.notEqual(/WALLET_SEED=(.+)/.exec(first)[1], /WALLET_SEED=(.+)/.exec(second)[1]);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal(invoke('session-init.mjs', ['preview', 'alice']).status, 1);
    assert.equal(await readFile(file, 'utf8'), first);
    assert.equal(invoke('session-init.mjs', ['preview', '../alice']).status, 1);
  });
});

test('session dispatch enforces the selected profile instead of inherited wallet credentials', async () => {
  await fixture(async (folder, invoke) => {
    const network = join(folder, 'Lessons/Lesson 13/Solution/network');
    await writeFile(join(network, '.env.preview.alice.local'), 'MIDNIGHT_NETWORK=preview\nCOURSE_PARTICIPANT=alice\nWALLET_SEED=profile-seed\nPRIVATE_STATE_PASSWORD=profile-password\nBLOCKFROST_PROJECT_ID=profile-token\n');
    // This stand-in observes process dispatch only; it does not claim SDK or transaction behavior.
    await writeFile(join(network, 'build/session.js'), 'console.log(JSON.stringify({network:process.env.MIDNIGHT_NETWORK,participant:process.env.COURSE_PARTICIPANT,seed:process.env.WALLET_SEED,password:process.env.PRIVATE_STATE_PASSWORD,token:process.env.BLOCKFROST_PROJECT_ID,address:process.env.CONTRACT_ADDRESS,args:process.argv.slice(2)}));');
    const result = invoke('session.mjs', ['preview', 'alice', 'read'], { MIDNIGHT_NETWORK: 'mainnet', COURSE_PARTICIPANT: 'wrong', WALLET_SEED: 'wrong', PRIVATE_STATE_PASSWORD: 'wrong', BLOCKFROST_PROJECT_ID: 'wrong', CONTRACT_ADDRESS: 'public-address' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { network: 'preview', participant: 'alice', seed: 'profile-seed', password: 'profile-password', token: 'profile-token', address: 'public-address', args: ['read'] });
    for (const args of [['preview','alice','commit','6'],['preview','alice','reveal','5'],['testnet','alice','read'],['preview','../alice','read']]) assert.equal(invoke('session.mjs', args).status, 1);
  });
});
