// Execute the deliberately requested local network workflow one step at a time.
import { spawnSync } from 'node:child_process';
// Resolve the network workspace, which owns its own lockfile and runtime.
import { fileURLToPath } from 'node:url';
// Check required local credentials before opening wallet connections.
import { existsSync } from 'node:fs';
// Locate the SDK scripts and storage beneath the solutions directory.
const cwd = fileURLToPath(new URL('../../Lesson 13/Solution/network/', import.meta.url));
// Require the documented private-store password rather than inventing one.
if (!existsSync(new URL('../../Lesson 13/Solution/network/.env.local', import.meta.url))) {
  console.error('Create Lessons/Lesson 13/Solution/network/.env.local as described in Lessons/Lesson 13/Exercise/README.md');
  process.exit(1);
}
// Avoid deploying a fresh contract when the following call would refuse to replace an old opening.
if (existsSync(new URL('../../Lesson 13/Solution/network/opening.json', import.meta.url))) {
  console.error('An opening already exists in Lessons/Lesson 13/Solution/network/opening.json. Preserve or recover that experiment before starting a new deployment.');
  process.exit(1);
}
// Build, deploy a fresh local contract, then commit/reveal and verify indexed state.
for (const script of ['build', 'deploy', 'call']) {
  // The nested manifest fixes all endpoints to the local undeployed devnet.
  const result = spawnSync('npm', ['run', script], { cwd, stdio: 'inherit' });
  // Preserve the first failure; never continue into another operation after it.
  if (result.error || result.status !== 0) {
    console.error(result.error?.message ?? `Network step ${script} failed`);
    process.exit(result.status || 1);
  }
}
