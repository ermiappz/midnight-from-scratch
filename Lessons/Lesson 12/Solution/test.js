// Ask Compose to validate the configuration without starting or stopping services.
import { spawnSync } from 'node:child_process';
// Resolve the fixture beside this test rather than relying on the caller's directory.
import { fileURLToPath } from 'node:url';
// Point at the pinned local service definitions supplied for this lesson.
const config = fileURLToPath(new URL('./compose.yaml', import.meta.url));
// Validate structure and interpolation; no Docker containers are created by this command.
const result = spawnSync('docker', ['compose', '-f', config, 'config', '--quiet'], { stdio: 'inherit' });
// Report a missing Docker CLI or invalid configuration as a failing lesson check.
if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? 'Compose configuration check failed');
  process.exit(result.status || 1);
}
// Distinguish a configuration check from live network availability.
console.log('Lesson 12: Compose configuration valid; no services started');
