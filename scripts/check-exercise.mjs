// Resolve exercise folders independently of where the command is invoked.
import { fileURLToPath } from 'node:url';
// Persist checkpoint history without mixing it into the learner's source files.
import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
// Join lesson paths without accepting user-provided filesystem paths.
import { join } from 'node:path';
// Remember which revision actually passed a checkpoint.
import { createHash } from 'node:crypto';
// Keep CLI validation and stage labels shared with folder-level commands.
import { lessons, parseCheckpoint } from './exercises/catalog.mjs';
// Grade local implementations rather than running solution code.
import { localCheck } from './exercises/local-checks.mjs';
// Keep network read-back separate from local compilation and execution.
import { networkCheck } from './exercises/network-checks.mjs';
// Add the independent project exercises introduced in lessons 16–20.
import { projectCheck } from './exercises/project-checks.mjs';
// Keep AI worksheet validation explicit about its limited scope.
import { agenticCheck, aiCheck } from './exercises/ai-checks.mjs';
// Distinguish missing tools/services from an incorrect exercise answer.
import { Blocked } from './exercises/helpers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const historyPath = join(root, '.exercise-progress.json');
const exerciseFolder = lesson => join(root, 'Lessons', `Lesson ${String(lesson).padStart(2, '0')}`, 'Exercise');
// Color only interactive output; redirected logs remain readable plain text.
const color = (code, text) => process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;

// Exclude generated files, installed packages and secret runtime data from revision fingerprints.
function fingerprint(folder) {
  const hash = createHash('sha256');
  function walk(path, prefix = '') {
    for (const item of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith('.') || ['node_modules', 'managed', 'build', 'opening.json', 'deployment.json', 'round-deployment.json'].includes(item.name)) continue;
      const relative = `${prefix}${item.name}`;
      if (item.isDirectory()) walk(join(path, item.name), `${relative}/`);
      else if (item.isFile()) hash.update(relative).update(readFileSync(join(path, item.name)));
    }
  }
  walk(folder);
  return hash.digest('hex');
}
// Refuse to silently discard an unreadable progress file.
function history() {
  if (!existsSync(historyPath)) return {};
  try { return JSON.parse(readFileSync(historyPath, 'utf8')); }
  catch { throw new Error('Cannot read .exercise-progress.json. Repair or rename that progress file before retrying.'); }
}
// Save the latest check result atomically so an interrupted write cannot truncate history.
function record(id, status, folder) {
  const records = history();
  records[id] = { status, fingerprint: fingerprint(folder), checkedAt: new Date().toISOString() };
  writeFileSync(`${historyPath}.tmp`, JSON.stringify(records, null, 2) + '\n');
  renameSync(`${historyPath}.tmp`, historyPath);
}
// Allow reference checks and tests to reuse the grading rules without writing learner progress.
export async function evaluateCheckpoint(id, folder) {
  const { lesson, letter } = parseCheckpoint(id);
  if (!letter) throw new Error('Select a stage such as 3A.');
  if (lesson === 22) return agenticCheck(id, folder);
  if (lesson === 21) return aiCheck(id, folder);
  if (lesson >= 16) return projectCheck(id, folder);
  if (lesson >= 12 && lesson <= 14) return networkCheck(id, folder);
  return localCheck(id, folder);
}
// Show completed revisions separately from results that still match the current files.
export function showProgress(onlyLesson) {
  const records = history();
  for (const [number, [title, ...parts]] of Object.entries(lessons)) {
    if (onlyLesson && Number(number) !== onlyLesson) continue;
    const folder = exerciseFolder(number);
    const current = existsSync(folder) ? fingerprint(folder) : '';
    console.log(`\n${number}. ${title}`);
    for (const [letter, label] of parts) {
      const id = `${number}${letter}`, saved = records[id];
      const status = !saved ? 'TODO' : saved.status === 'passed' && saved.fingerprint !== current ? 'PASSED EARLIER' : saved.status.toUpperCase();
      console.log(`  ${id.padEnd(4)} ${status.padEnd(15)} ${label}`);
    }
  }
  console.log('\nPASSED EARLIER records a completed stage before later edits; it does not claim the current files were rechecked.');
  console.log('Run a stage: npm run check -- 3A. Design reviews and live deployment evidence are separate from automated checks.');
}
// Run one requested checkpoint and explain the next action without changing any starter source.
export async function checkExercise(args = process.argv.slice(2)) {
  try {
    if (args.length !== 1) throw new Error('Usage: npm run check -- <stage, e.g. 3A> | <lesson, e.g. 3> | progress');
    if (args[0] === 'progress') { showProgress(); return 0; }
    const { lesson, letter, id } = parseCheckpoint(args[0]);
    if (!letter) { showProgress(lesson); return 0; }
    const folder = exerciseFolder(lesson);
    const parts = lessons[lesson].slice(1), index = parts.findIndex(([part]) => part === letter);
    console.log(`Checking ${id}: ${parts[index][1]}\nYour files: Lessons/Lesson ${String(lesson).padStart(2, '0')}/Exercise/`);
    try {
      await evaluateCheckpoint(id, folder);
      record(id, 'passed', folder);
      console.log(color('32', `✓ ${id} successful — the automated checkpoint passed.`));
      if (lesson === 21 || lesson === 22) console.log('This validates the planning artifact; claimed agent activity, test evidence and human review are not independently verified.');
      if (['14E', '14F', '14G'].includes(id)) console.log('Concept answers passed. Collect and review live deployment/sharing evidence separately.');
      const next = parts[index + 1] ? `${lesson}${parts[index + 1][0]}` : lessons[lesson + 1] ? `${lesson + 1}A` : undefined;
      if (next) console.log(`Proceed to ${next}. Check it with: npm run check -- ${next}`);
      else console.log('Automated stages complete for this implementation. Use the capstone review checklist before claiming a finished deployed application.');
      return 0;
    } catch (error) {
      const blocked = error instanceof Blocked;
      record(id, blocked ? 'blocked' : 'needs work', folder);
      console.error(color(blocked ? '33' : '31', `${blocked ? 'BLOCKED' : 'NEEDS WORK'} ${id}: ${error.message}`));
      console.error(`Read Lessons/Lesson ${String(lesson).padStart(2, '0')}/Exercise/README.md, fix this stage, then rerun npm run check -- ${id}.`);
      return blocked ? 2 : 1;
    }
  } catch (error) { console.error(error.message); return 1; }
}
// Importing this module from a folder wrapper or reference test must not invoke its CLI twice.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = await checkExercise();
