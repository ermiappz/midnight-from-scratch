// Use argument arrays so lesson paths never become executable shell text.
import { spawnSync } from 'node:child_process';
// Check prerequisites before starting compilation or an SDK build.
import { existsSync } from 'node:fs';
// Locate the repository from this script, independently of the caller's directory.
import { fileURLToPath } from 'node:url';
// Join filesystem paths without relying on platform-specific separators.
import { join } from 'node:path';

// Allow only completed reference lessons.
const input = process.argv.slice(2);
// Reject misspellings and extra arguments before doing work.
if (input.length !== 1 || !/^(?:[1-9]|1[0-9]|2[0-2])$/.test(input[0])) {
  console.error('Usage: npm run lesson -- <1..22>');
  process.exit(1);
}
// Convert the validated identifier for the dispatch below.
const lesson = Number(input[0]);
// Resolve generated output inside each lesson's Solution folder, never inside Exercise.
const root = fileURLToPath(new URL('../', import.meta.url));
// Keep network SDK dependencies separate from the early local runtime graph.
const solutionFolder = number => join(root, 'Lessons', `Lesson ${String(number).padStart(2, '0')}`, 'Solution');
const network = join(solutionFolder(13), 'network');

// Stop immediately on a failed step so stale generated code is never executed.
function run(command, args, cwd = root) {
  // Inherit output so compiler errors and assertion failures stay visible.
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  // Explain a missing executable separately from a failing program.
  if (result.error) {
    console.error(`Could not run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  // Propagate failure to npm and to callers checking the whole solution set.
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Use the same compiler pin as the lessons while allowing an explicit binary path.
function compile(source, output, full = false) {
  // Full compilation generates proving material; local checks deliberately skip it.
  const flags = full ? [] : ['--skip-zk'];
  // A failed compile exits before the following test can read an old build.
  run(process.env.COMPACT_BIN ?? 'compact', ['compile', '+0.31.1', ...flags, source, output]);
}

// Identify the requested reference before its tools print their own output.
console.log(`Lesson ${lesson}: reference solution`);
// Lesson 1 has no contract yet, and lesson 12 checks infrastructure rather than Compact.
if (lesson >= 16) {
  // New project references reuse stage specifications without recording learner progress.
  run(process.execPath, [join(solutionFolder(lesson), 'test.mjs')]);
} else if (lesson === 1 || lesson === 12) {
  run(process.execPath, [join(solutionFolder(lesson), 'test.js')]);
} else if (lesson === 13 || lesson === 14) {
  // Do not install a large SDK or invent credentials as a side effect of a test command.
  if (!existsSync(join(network, 'node_modules', 'typescript'))) {
    console.error("First run: npm ci --prefix 'Lessons/Lesson 13/Solution/network'");
    process.exit(1);
  }
  // Build both interfaces because the shared SDK workspace includes both examples.
  compile(join(root, 'Lessons/Lesson 10/Solution/feedback.compact'), join(network, 'managed/feedback'), lesson === 14);
  // Lesson 14 deploys feedback only; the round interface needs no proving keys yet.
  compile(join(root, 'Lessons/Lesson 15/Solution/round.compact'), join(network, 'managed/round'));
  // Lesson 13 checks types; lesson 14 explicitly executes the local deployment workflow.
  run(process.execPath, [join(solutionFolder(lesson), 'test.js')]);
} else {
  // Lesson 11 rehearses the commands using lesson 10's completed contract.
  const sourceLesson = lesson === 11 ? 10 : lesson;
  // Each local solution owns its generated files to avoid cross-lesson contamination.
  const folder = solutionFolder(sourceLesson);
  // Keep the established later filenames while using one filename for the early stages.
  const source = sourceLesson === 10 ? 'feedback.compact' : sourceLesson === 15 ? 'round.compact' : 'lesson.compact';
  // The later runners already import their named contract subdirectories.
  const output = sourceLesson === 10 ? 'managed/feedback' : sourceLesson === 15 ? 'managed/round' : 'managed';
  // Compile before executing this solution's assertions.
  compile(join(folder, source), join(folder, output));
  // The lesson 11 wrapper deliberately delegates to lesson 10's now-fresh output.
  run(process.execPath, [join(solutionFolder(lesson), 'test.js')]);
}
