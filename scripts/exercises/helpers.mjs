// Fail checkpoints on incorrect behavior, not on the presence of a printed success line.
import assert from 'node:assert/strict';
// Run compilers and learner scripts without shell interpolation.
import { spawnSync } from 'node:child_process';
// Read source and create short-lived probes beside the learner's imports.
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
// Keep paths independent of the terminal's current directory.
import { join, dirname } from 'node:path';
// Turn generated module paths into importable URLs.
import { pathToFileURL } from 'node:url';
// Use unique probe filenames and fresh commitment secrets.
import { randomBytes, randomUUID } from 'node:crypto';
// Use the same runtime as the local course contracts.
import * as runtime from '@midnight-ntwrk/compact-runtime';

export { assert, runtime };
// Give every independent attempt unpredictable private input.
export const bytes = () => new Uint8Array(randomBytes(32));
// Make prerequisite failures distinguishable from incorrect exercise answers.
export class Blocked extends Error {}

// Surface a useful error when a required learner file is still missing.
export function source(folder, file) {
  const path = join(folder, file);
  assert.ok(existsSync(path), `Missing ${file}. Create it in this exercise folder using the guide.`);
  return readFileSync(path, 'utf8');
}
// Explain malformed JSON in terms of the file the learner is editing.
export function json(folder, file) {
  try { return JSON.parse(source(folder, file)); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
}
// Stop immediately on a failed tool call rather than falling back to stale generated code.
export function run(command, args, cwd, timeout = 120_000) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024, shell: false });
  if (result.error?.code === 'ENOENT') throw new Blocked(`Install or select ${command} before this checkpoint.`);
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed:\n${(result.stderr || result.stdout).slice(-4000)}`);
  return result.stdout;
}
// Compile the actual exercise before inspecting or executing its generated interface.
export async function compile(folder, name = 'hello.compact', output = 'managed/hello', full = false) {
  source(folder, name);
  run(process.env.COMPACT_BIN ?? 'compact', ['compile', '+0.31.1', ...(full ? [] : ['--skip-zk']), name, output], folder, full ? 600_000 : 120_000);
  return import(pathToFileURL(join(folder, output, 'contract/index.js')).href + `?check=${randomUUID()}`);
}
// Execute the learner's runner with a small appended assertion block in the same module scope.
export function probe(folder, file, checks) {
  const code = file ? source(folder, file) : '';
  const path = join(file ? dirname(join(folder, file)) : folder, `.exercise-probe-${randomUUID()}.mjs`);
  try {
    // Keep ordinary learner errors concise while still returning a failing process status.
    const report = "process.on('uncaughtException', error => { console.error(error.message); process.exitCode = 1; });\n";
    writeFileSync(path, `${report}${code}\nimport __exerciseAssert from 'node:assert/strict';\n${checks}\n`, { flag: 'wx' });
    return run(process.execPath, [path], folder, 30_000);
  } finally {
    if (existsSync(path)) unlinkSync(path);
  }
}
// Require real callable exports before testing negative cases that might otherwise fail for the wrong reason.
export function required(h, names) {
  for (const name of names) assert.equal(typeof h.contract.circuits[name], 'function', `Implement exported circuit ${name} before this check can run.`);
}
// Give each test fresh state and carry only successful call results forward.
export function harness(module, { privateState = {}, witnesses = {}, args = [], address = runtime.sampleContractAddress() } = {}) {
  const contract = new module.Contract(witnesses);
  const key = '0'.repeat(64);
  const initial = contract.initialState(runtime.createConstructorContext(privateState, key), ...args);
  let context = runtime.createCircuitContext(address, key, initial.currentContractState, privateState);
  return {
    contract,
    get context() { return context; },
    peek: () => module.ledger(context.currentQueryContext.state),
    call(name, ...values) {
      assert.equal(typeof contract.circuits[name], 'function', `Missing circuit ${name}.`);
      const result = contract.circuits[name](context, ...values);
      context = result.context;
      return result.result;
    },
  };
}
// Supply the callback declared by the completed early lessons without assuming the callback is honest.
export const withWitness = (module, value = 4n) => harness(module, {
  privateState: { preferredRating: 4n },
  witnesses: { preferredRating: ({ privateState }) => [privateState, value] },
});
// Verify that a forbidden operation really fails; never catch this assertion as the expected circuit error.
export function rejects(action, reason) { assert.throws(action, undefined, reason); }
// Import a learner's small ES module after its files have been checked.
export async function learnerModule(folder, file) {
  source(folder, file);
  return import(pathToFileURL(join(folder, file)).href + `?check=${randomUUID()}`);
}
