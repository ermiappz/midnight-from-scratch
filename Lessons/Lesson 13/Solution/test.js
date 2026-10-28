// Build the SDK adapter against its own dependency graph rather than the root runtime.
import { spawnSync } from 'node:child_process';
// Resolve the shared solution workspace independently of where npm was invoked.
import { fileURLToPath } from 'node:url';
// Keep emitted JS inside the network solution's ignored build directory.
const cwd = fileURLToPath(new URL('./network/', import.meta.url));
// Validate the actual TypeScript modules after the dispatcher generated both interfaces.
const result = spawnSync('npm', ['run', 'build'], { cwd, stdio: 'inherit' });
// Stop on type errors instead of claiming the wallet is ready.
if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? 'Network TypeScript build failed');
  process.exit(result.status || 1);
}
// Make the limit of this offline check visible to the learner.
console.log("Lesson 13: SDK code builds. Live readiness: npm --prefix 'Lessons/Lesson 13/Solution/network' run status");
