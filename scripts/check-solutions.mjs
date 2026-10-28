// Run actual solution commands as child processes so failure stops the sequence.
import { spawnSync } from 'node:child_process';
// Locate the dispatcher without depending on the shell's working directory.
import { fileURLToPath } from 'node:url';
// Keep Docker, wallet synchronization and deployment out of the default local suite.
const lessons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 22];
// Resolve the script once for every lesson invocation below.
const runner = fileURLToPath(new URL('./run-lesson.mjs', import.meta.url));
// Test every completed local reference against freshly generated code.
for (const lesson of lessons) {
  // Use this process's Node version rather than a different executable found on PATH.
  const result = spawnSync(process.execPath, [runner, String(lesson)], { stdio: 'inherit' });
  // Surface tool launch errors and unsuccessful assertions to npm.
  if (result.error || result.status !== 0) {
    console.error(`Lesson ${lesson} failed`, result.error?.message ?? '');
    process.exit(result.status || 1);
  }
}
// State the actual coverage rather than implying that network transactions were checked.
console.log('All local solutions passed (1–11 and 15–22). Network lessons are separate.');
