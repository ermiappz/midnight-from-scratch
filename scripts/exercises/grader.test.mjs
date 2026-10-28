// Exercise the grader itself so starters fail, completed work passes and broken behavior is caught.
import test from 'node:test';
// Assert expected check outcomes independently of terminal success text.
import assert from 'node:assert/strict';
// Create disposable workspaces without touching the learner's starter files or progress.
import { mkdtemp, writeFile, readFile, cp, rm, mkdir } from 'node:fs/promises';
// Resolve committed fixture and reference paths relative to the repository.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Run the real grader implementation, not a mock of its expected output.
import { evaluateCheckpoint } from '../check-exercise.mjs';
// Keep stage and answer expectations shared with the public checkpoint descriptions.
import { lessons, questions, parseCheckpoint } from './catalog.mjs';
// Reuse tiny completed runners while preserving their normal lexical bindings.
import { runners } from './fixtures/runners.mjs';
// Verify command failures without shell interpolation.
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const answers = Object.fromEntries(Object.entries(questions).map(([id, fields]) => [id, Object.fromEntries(Object.entries(fields).map(([key, [value]]) => [key, value]))]));
// Keep generated contracts under a temporary repository child so imports use the pinned runtime.
async function fixture(action) {
  const folder = await mkdtemp(join(root, '.exercise-grader-'));
  try {
    await writeFile(join(folder, 'package.json'), JSON.stringify({ name: 'fixture', private: true, type: 'module', dependencies: { '@midnight-ntwrk/compact-runtime': '0.16.0' }, scripts: { start: 'node run.js', 'compile-compact': 'compact compile +0.31.1 --skip-zk hello.compact managed/hello' } }));
    await writeFile(join(folder, 'answers.json'), JSON.stringify(answers));
    await action(folder);
  } finally { await rm(folder, { recursive: true, force: true }); }
}
// Copy only source into the fixture; each test must compile its own fresh output.
async function contract(folder, number, file = 'hello.compact') {
  const origin = number === 10 ? 'feedback.compact' : number === 15 ? 'round.compact' : 'lesson.compact';
  await cp(join(root, 'Lessons', `Lesson ${String(number).padStart(2, '0')}`, 'Solution', origin), join(folder, file));
}

test('CLI rejects unknown checkpoints instead of marking them complete', () => {
  for (const input of ['23A', '../3A', '3Z', '0A', '3A extra']) assert.throws(() => parseCheckpoint(input));
  assert.equal(parseCheckpoint('3a').id, '3A');
  const result = spawnSync(process.execPath, [join(root, 'scripts/check-exercise.mjs'), '3Z'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no stage Z/);
});

test('all untouched local first-stage starters need work', async () => {
  for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20]) {
    // This uses isolated copies, so compilation cannot populate the starter directory.
    await fixture(async folder => {
      await cp(join(root, 'Lessons', `Lesson ${String(number).padStart(2, '0')}`, 'Exercise'), folder, { recursive: true, filter: path => !/\/(managed|node_modules|build)(\/|$)/.test(path) });
      await assert.rejects(() => evaluateCheckpoint(`${number}A`, folder), undefined, `Untouched ${number}A unexpectedly passed`);
    });
  }
});

test('early contract and runner checkpoints accept completed staged work', async () => {
  await fixture(async folder => {
    await evaluateCheckpoint('1A', folder);
    for (const number of [2, 3, 4, 5, 6, 7, 9]) {
      await contract(folder, number);
      if (number === 3) await writeFile(join(folder, 'run.js'), runners[3]);
      if (number === 4) await writeFile(join(folder, 'run.js'), runners[4]);
      if (number === 5) await writeFile(join(folder, 'run.js'), runners[5]);
      if (number === 6) await writeFile(join(folder, 'run.js'), runners[6]);
      if (number === 7) await writeFile(join(folder, 'run.js'), runners[7]);
      if (number === 9) await cp(join(root, 'scripts/exercises/fixtures/runner9.mjs'), join(folder, 'run.js'));
      for (const [letter] of lessons[number].slice(1)) await evaluateCheckpoint(`${number}${letter}`, folder);
    }
  });
});

test('witness experiments grade the callback actually written by the learner', async () => {
  await fixture(async folder => {
    await contract(folder, 8);
    await evaluateCheckpoint('8A', folder);
    await writeFile(join(folder, 'run.js'), runners[7].replace('[privateState, privateState.preferredRating]', '[privateState, 2n]'));
    await evaluateCheckpoint('8B', folder);
    const invalid = runners[7].split('// Let the circuit request')[0].replace('[privateState, privateState.preferredRating]', '[privateState, 6n]') + '\ntry { contract.circuits.applyPreferredRating(read.context); } catch {}\n';
    await writeFile(join(folder, 'run.js'), invalid);
    await evaluateCheckpoint('8C', folder);
    await writeFile(join(folder, 'run.js'), runners[7]);
    await evaluateCheckpoint('8D', folder);
  });
});

test('10A and 10B accept their small intermediate interfaces without future circuits', async () => {
  await fixture(async folder => {
    const base = 'pragma language_version 0.23;\nimport CompactStandardLibrary;\n';
    const setup = runners[3].split('// Pass the first message')[0].replace('managed/hello', 'managed/feedback').replace('const context =', 'let context =');
    await writeFile(join(folder, 'feedback.compact'), base + 'export ledger submissions: Map<Uint<8>, Uint<8>>;\nexport circuit storeRating(owner: Uint<8>, choice: Uint<8>): [] { submissions.insert(disclose(owner), disclose(choice)); }\n');
    await writeFile(join(folder, 'run-feedback.js'), setup + "\ncontext = contract.circuits.storeRating(context, 1n, 3n).context;\n");
    await evaluateCheckpoint('10A', folder);
    await writeFile(join(folder, 'feedback.compact'), base + 'export ledger submissions: Map<Bytes<32>, Uint<8>>;\ncircuit keyFor(secret: Bytes<32>): Bytes<32> { return persistentHash<Bytes<32>>(secret); }\nexport circuit participantId(secret: Bytes<32>): Bytes<32> { return disclose(keyFor(secret)); }\nexport circuit storeRating(secret: Bytes<32>, choice: Uint<8>): [] { submissions.insert(disclose(keyFor(secret)), disclose(choice)); }\n');
    await writeFile(join(folder, 'run-feedback.js'), setup + '\nconst aliceSecret = new Uint8Array(32);\nconst aliceId = contract.circuits.participantId(context, aliceSecret);\ncontext = contract.circuits.storeRating(aliceId.context, aliceSecret, 3n).context;\n');
    await evaluateCheckpoint('10B', folder);
  });
});

test('commitment stages reject real bugs, not just missing TODO text', async () => {
  await fixture(async folder => {
    await contract(folder, 9);
    let code = await readFile(join(folder, 'hello.compact'), 'utf8');
    code = code.replace(/assert\(persistentCommit<Uint<8>>\(choice, salt\) == ratingCommitment,[^\n]+/, 'assert(true, "broken opening check");');
    await writeFile(join(folder, 'hello.compact'), code);
    await assert.rejects(() => evaluateCheckpoint('9C', folder), /Reject a different valid choice/);
  });
});

test('later map and round checkpoints accept complete references and staged runners', async () => {
  await fixture(async folder => {
    await contract(folder, 10, 'feedback.compact');
    const runner = await readFile(join(root, 'Lessons/Lesson 10/Solution/run-feedback.js'), 'utf8');
    // The commit-only stage inspects the sealed context before the later reveal experiment exists.
    await writeFile(join(folder, 'run-feedback.js'), runner.split('const aliceReveal =')[0]);
    await evaluateCheckpoint('10C', folder);
    await writeFile(join(folder, 'run-feedback.js'), runner);
    for (const letter of ['D', 'E', 'F']) await evaluateCheckpoint(`10${letter}`, folder);
    await contract(folder, 15, 'round.compact');
    await cp(join(root, 'Lessons/Lesson 15/Solution/run-round.js'), join(folder, 'run-round.js'));
    for (const [letter] of lessons[15].slice(1)) await evaluateCheckpoint(`15${letter}`, folder);
  });
});

test('configuration checkpoints validate the actual learner configuration', async () => {
  await fixture(async folder => {
    await mkdir(join(folder, 'network'));
    await cp(join(root, 'network/compose.yaml'), join(folder, 'network/compose.yaml'));
    await evaluateCheckpoint('12A', folder);
    await evaluateCheckpoint('12C', folder);
    await evaluateCheckpoint('14D', folder);
    await writeFile(join(folder, 'network/compose.yaml'), 'services: {}\n');
    await assert.rejects(() => evaluateCheckpoint('12A', folder), /Configure the node/);
  });
});

test('full project references pass and a vacuous test suite fails mutation checks', async () => {
  for (let number = 16; number <= 20; number++) {
    for (const [letter] of lessons[number].slice(1)) await evaluateCheckpoint(`${number}${letter}`, join(root, 'Lessons', `Lesson ${number}`, 'Solution'));
  }
  await fixture(async folder => {
    await contract(folder, 15, 'round.compact');
    await writeFile(join(folder, 'tests.mjs'), 'export function testHappyPath() {}\n');
    await assert.rejects(() => evaluateCheckpoint('16A', folder), /missed the wrong-total defect/);
  });
});

test('lesson 11 checks the local manifest, lockfile and actual compile/run workflow', async () => {
  await fixture(async folder => {
    await contract(folder, 10, 'feedback.compact');
    await cp(join(root, 'Lessons/Lesson 10/Solution/run-feedback.js'), join(folder, 'run-feedback.js'));
    await cp(join(root, 'package-lock.json'), join(folder, 'package-lock.json'));
    const pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    Object.assign(pkg.scripts, { 'compile:feedback': 'compact compile +0.31.1 --skip-zk feedback.compact managed/feedback', feedback: 'node run-feedback.js', 'check:feedback': 'npm run compile:feedback && npm run feedback' });
    await writeFile(join(folder, 'package.json'), JSON.stringify(pkg));
    for (const letter of ['A', 'B', 'C']) await evaluateCheckpoint(`11${letter}`, folder);
  });
});

// Enable this offline build check when a compatible SDK dependency installation is available.
const sdkModules = process.env.EXERCISE_SDK_NODE_MODULES;
test('SDK build stages use the exercise workspace and resolve generated module imports', { skip: !sdkModules }, async () => {
  const { symlink } = await import('node:fs/promises');
  await fixture(async folder => {
    const network = join(folder, 'network');
    await mkdir(join(network, 'src'), { recursive: true });
    for (const file of ['package.json', 'tsconfig.json']) await cp(join(root, 'Lessons/Lesson 13/Solution/network', file), join(network, file));
    for (const file of ['config', 'wallet', 'providers', 'status']) await cp(join(root, `Lessons/Lesson 13/Solution/network/src/${file}.ts`), join(network, `src/${file}.ts`));
    await symlink(sdkModules, join(network, 'node_modules'), 'dir');
    for (const id of ['13A', '13B', '13D']) await evaluateCheckpoint(id, folder);
    // A named but empty exported function is not an assembled provider bundle.
    await writeFile(join(network, 'src/providers.ts'), 'export function providersFor() { return undefined; }\n');
    await assert.rejects(() => evaluateCheckpoint('13D', folder), /failed:/);
  });
});

test('CLI records a passed revision, shows the next stage, and invalidates a failed recheck', async () => {
  await fixture(async folder => {
    // Give this isolated CLI its own repository root so real learner history is untouched.
    await mkdir(join(folder, 'scripts'), { recursive: true });
    await cp(join(root, 'scripts/exercises'), join(folder, 'scripts/exercises'), { recursive: true });
    await cp(join(root, 'scripts/check-exercise.mjs'), join(folder, 'scripts/check-exercise.mjs'));
    const work = join(folder, 'Lessons/Lesson 03/Exercise');
    await mkdir(work, { recursive: true });
    await cp(join(root, 'Lessons/Lesson 03/Exercise/check.mjs'), join(work, 'check.mjs'));
    const pkg = { private: true, type: 'module', dependencies: { '@midnight-ntwrk/compact-runtime': '0.16.0' } };
    await writeFile(join(work, 'package.json'), JSON.stringify(pkg));
    const invoke = (...args) => spawnSync(process.execPath, [join(folder, 'scripts/check-exercise.mjs'), ...args], { cwd: folder, encoding: 'utf8' });
    const passed = invoke('3A');
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /3A successful/);
    assert.match(passed.stdout, /Proceed to 3B/);
    const history = JSON.parse(await readFile(join(folder, '.exercise-progress.json'), 'utf8'));
    assert.equal(history['3A'].status, 'passed');
    assert.equal(history['3B'], undefined, 'Checking A must not mark B complete.');
    await writeFile(join(work, 'run.js'), '// A later-stage edit.\n');
    assert.match(invoke('3').stdout, /PASSED EARLIER/);
    await writeFile(join(work, 'package.json'), JSON.stringify({ ...pkg, type: 'commonjs' }));
    const failed = invoke('3A');
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /NEEDS WORK 3A/);
    assert.match(invoke('3').stdout, /NEEDS WORK/);
    // Folder-local commands must resolve the same grading entry point.
    await writeFile(join(work, 'package.json'), JSON.stringify(pkg));
    const wrapper = spawnSync(process.execPath, [join(work, 'check.mjs'), 'A'], { cwd: work, encoding: 'utf8' });
    assert.equal(wrapper.status, 0, wrapper.stderr);
  });
});

test('a failed compiler cannot pass using an older successful generated contract', async () => {
  await fixture(async folder => {
    await contract(folder, 2);
    await evaluateCheckpoint('2B', folder);
    const previous = process.env.COMPACT_BIN;
    try {
      // Node cannot execute Compact's compile command; the old generated file remains present.
      process.env.COMPACT_BIN = process.execPath;
      await assert.rejects(() => evaluateCheckpoint('2B', folder), /failed:/);
    } finally {
      if (previous === undefined) delete process.env.COMPACT_BIN;
      else process.env.COMPACT_BIN = previous;
    }
  });
});

// A complete AI worksheet is a plan; malformed cases and missing context must fail.
test('bonus review stages accept an honest plan and reject incomplete or duplicate cases', async () => {
  await fixture(async folder => {
    const complete = JSON.parse(await readFile(join(root, 'Lessons/Lesson 21/Solution/review.json'), 'utf8'));
    await writeFile(join(folder, 'review.json'), JSON.stringify(complete));
    for (const id of ['21A', '21B', '21C']) await evaluateCheckpoint(id, folder);
    complete.verification.cases[1].id = complete.verification.cases[0].id;
    await writeFile(join(folder, 'review.json'), JSON.stringify(complete));
    await assert.rejects(() => evaluateCheckpoint('21C', folder), /each required case/);
    await cp(join(root, 'Lessons/Lesson 21/Exercise/review.json'), join(folder, 'review.json'));
    await assert.rejects(() => evaluateCheckpoint('21A', folder), /feature goal/);
  });
});

test('agentic project stages accept an honest reference plan and reject an untouched starter', async () => {
  await fixture(async folder => {
    const complete = JSON.parse(await readFile(join(root, 'Lessons/Lesson 22/Solution/project-plan.json'), 'utf8'));
    await writeFile(join(folder, 'project-plan.json'), JSON.stringify(complete));
    for (const id of ['22A', '22B', '22C', '22D', '22E']) await evaluateCheckpoint(id, folder);
    await cp(join(root, 'Lessons/Lesson 22/Exercise/project-plan.json'), join(folder, 'project-plan.json'));
    await assert.rejects(() => evaluateCheckpoint('22A', folder), /project name/);
  });
});
