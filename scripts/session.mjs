// Execute one explicitly selected participant session using the pinned SDK workspace.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const [network, participant, action, ...args] = process.argv.slice(2);
// Validate fixed arguments before any wallet or transaction code can load.
if (!['undeployed', 'preview', 'preprod', 'mainnet'].includes(network) || !/^[a-z0-9-]{1,32}$/.test(participant ?? '') || !['info', 'register-dust', 'deploy', 'read', 'commit', 'reveal'].includes(action) || (action === 'commit' ? args.length !== 1 || !/^[1-5]$/.test(args[0]) : args.length !== 0)) {
  console.error('Usage: npm run session -- <network> <participant> <info|register-dust|deploy|read|commit 1..5|reveal>');
  process.exit(1);
}
const cwd = fileURLToPath(new URL('../Lessons/Lesson 13/Solution/network/', import.meta.url));
const file = `.env.${network}.${participant}.local`;
if (!existsSync(join(cwd, file)) || !existsSync(join(cwd, 'build/session.js'))) {
  console.error('Create the participant configuration with session:init, install the network dependencies, and build as described in docs/deployment.md.');
  process.exit(1);
}
// The selected profile owns its wallet credentials; unrelated shell settings cannot replace them.
const env = { ...process.env, MIDNIGHT_NETWORK: network, COURSE_PARTICIPANT: participant };
for (const key of ['WALLET_SEED', 'PRIVATE_STATE_PASSWORD', 'BLOCKFROST_PROJECT_ID']) delete env[key];
// Preserve an explicitly shared address and the separate production submission opt-in.
const result = spawnSync(process.execPath, [`--env-file=${file}`, 'build/session.js', action, ...args], { cwd, env, stdio: 'inherit', shell: false });
if (result.error || result.status !== 0) process.exit(result.status || 1);
