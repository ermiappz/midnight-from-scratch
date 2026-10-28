// Use temporary private files for storage tests and always remove them afterward.
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
// Keep test data outside tracked exercise files.
import { tmpdir } from 'node:os';
// Build paths without embedding them in shell commands.
import { join } from 'node:path';
// Import notebook modules in a separate process to test actual restart behavior.
import { pathToFileURL } from 'node:url';
// Reuse independent contract execution and learner-module helpers.
import { assert, bytes, runtime, compile, harness, required, rejects, learnerModule, source, json, run, probe } from './helpers.mjs';
// Share the round's initial state setup without using its worked-answer tests.
import { makeRound, quiz } from './local-checks.mjs';

// Deliberately vary fixture behavior so a test containing no meaningful assertion cannot pass.
function fixtureFactory(module, defect) {
  return () => {
    const { h, admin, alice, bob, outsider } = makeRound(module);
    for (const person of [alice, bob]) { person.id = h.call('participantId', person.secret); h.call('admit', admin, person.id); }
    let corrupt = false;
    return {
      admin, alice, bob, outsider,
      state: () => ({ ...h.peek(), total: h.peek().total + (defect === 'wrong-total' || corrupt ? 1n : 0n) }),
      call(name, ...args) {
        if (name === 'reveal') {
          if (defect === 'accept-early' && h.peek().phase === 0n) return [];
          const isAlice = Buffer.from(args[0]).equals(Buffer.from(alice.id));
          if (isAlice && defect === 'accept-choice' && args[2] !== alice.choice) return [];
          if (isAlice && defect === 'accept-salt' && !Buffer.from(args[3]).equals(Buffer.from(alice.salt))) return [];
          if (defect === 'accept-replay' && h.peek().entries.lookup(args[0]).revealed) return [];
        }
        try { return h.call(name, ...args); }
        catch (error) {
          if (defect === 'corrupt-rejection') corrupt = true;
          throw error;
        }
      },
    };
  };
}
// Grade learner-written tests on a valid fixture and deliberately broken variants.
async function testTesting(part, folder) {
  const module = await compile(folder, 'round.compact', 'managed/round');
  const suite = await learnerModule(folder, 'tests.mjs');
  const names = { A: ['testHappyPath', ['wrong-total']], B: ['testWrongOpenings', ['accept-choice', 'accept-salt']], C: ['testReplayAndState', ['accept-early', 'accept-replay', 'corrupt-rejection']] };
  const [name, defects] = names[part];
  assert.equal(typeof suite[name], 'function', `Implement and export ${name}(makeRound).`);
  await suite[name](fixtureFactory(module));
  for (const defect of defects) {
    let caught = false;
    try { await suite[name](fixtureFactory(module, defect)); } catch { caught = true; }
    assert.ok(caught, `Your ${name} test missed the ${defect} defect. Add an assertion for that behavior.`);
  }
}
// Test storage with fresh inputs, including a second Node process that cannot share module memory.
async function testNotebook(part, folder) {
  const notebook = await learnerModule(folder, 'notebook.mjs');
  assert.equal(typeof notebook.saveOpening, 'function', 'Export saveOpening(file, scope, opening).');
  const dir = await mkdtemp(join(tmpdir(), 'midnight-notebook-'));
  const file = join(dir, 'opening.json');
  const scope = { account: 'alice', network: 'undeployed', contract: 'test-contract', round: 'one' };
  const opening = { secret: bytes(), salt: bytes(), choice: 3n };
  try {
    await notebook.saveOpening(file, scope, opening);
    const record = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(record.version, 1, 'Write notebook format version 1.');
    assert.deepEqual(record.scope, scope, 'Save all four scope fields.');
    assert.equal(record.opening.choice, '3', 'Serialize the bigint choice as a decimal string.');
    assert.deepEqual(record.opening.salt, [...opening.salt], 'Persist the original salt bytes.');
    assert.equal((await stat(file)).mode & 0o077, 0, 'Create the plaintext teaching file with permissions 0600.');
    if (part === 'A') return;
    assert.equal(typeof notebook.loadOpening, 'function', 'Export loadOpening(file, scope).');
    const restored = await notebook.loadOpening(file, scope);
    assert.deepEqual(restored, opening, 'Restore bigint and Uint8Array values without changing their bytes.');
    // Run the import in another process so an in-memory cache cannot masquerade as persistence.
    const script = `import assert from 'node:assert/strict'; import { loadOpening } from ${JSON.stringify(pathToFileURL(join(folder, 'notebook.mjs')).href)}; const value = await loadOpening(${JSON.stringify(file)}, ${JSON.stringify(scope)}); assert.equal(value.choice, 3n); assert.deepEqual([...value.salt], ${JSON.stringify([...opening.salt])});`;
    run(process.execPath, ['--input-type=module', '-e', script], folder);
    if (part === 'B') return;
    await assert.rejects(() => notebook.saveOpening(file, scope, { ...opening, choice: 5n }), undefined, 'Refuse to overwrite an existing opening.');
    for (const key of Object.keys(scope)) await assert.rejects(() => notebook.loadOpening(file, { ...scope, [key]: 'different' }), undefined, `Reject an opening for a different ${key}.`);
    await assert.rejects(() => notebook.loadOpening(join(dir, 'missing.json'), scope), undefined, 'Report missing opening data instead of generating a new salt.');
    record.opening.salt[0] = 999;
    await writeFile(file, JSON.stringify(record));
    await assert.rejects(() => notebook.loadOpening(file, scope), undefined, 'Reject invalid raw bytes instead of coercing them through Uint8Array.');
  } finally { await rm(dir, { recursive: true, force: true }); }
}
// Use the same public state vocabulary in controller tests and browser rendering.
const initialView = () => ({ connected: true, phase: 'submit', pending: false, committed: false, revealed: false, hasOpening: true, error: '' });
// Check temporal behavior: a resolved request is followed by read-back before the UI claims success.
async function testInterface(part, folder) {
  const workflow = await learnerModule(folder, 'workflow.mjs');
  assert.equal(typeof workflow.viewModel, 'function', 'Export viewModel(state).');
  const state = initialView();
  assert.equal(workflow.viewModel(state).canCommit, true, 'Enable the first submission while connected in submit phase.');
  assert.equal(workflow.viewModel({ ...state, connected: false }).canCommit, false, 'Disable network actions without a connection.');
  assert.equal(workflow.viewModel({ ...state, pending: true }).canCommit, false, 'Prevent repeated clicks while an operation is pending.');
  const reveal = { ...state, phase: 'reveal', committed: true };
  assert.equal(workflow.viewModel(reveal).canReveal, true, 'Enable reveal when there is a saved opening for a committed record.');
  assert.equal(workflow.viewModel({ ...reveal, hasOpening: false }).canReveal, false, 'An opening is required to reveal.');
  assert.equal(workflow.viewModel({ ...reveal, revealed: true }).canReveal, false, 'Disable repeated reveal.');
  assert.equal(workflow.viewModel({ ...reveal, phase: 'closed' }).canReveal, false, 'Disable reveal after closure.');
  assert.equal(workflow.viewModel(state).status, 'Not submitted', 'Describe the initial state accurately.');
  assert.equal(workflow.viewModel({ ...state, pending: true }).status, 'Pending confirmation', 'A pending call is not yet confirmed.');
  assert.equal(workflow.viewModel(reveal).status, 'Committed', 'Describe the confirmed commitment.');
  assert.equal(workflow.viewModel({ ...reveal, revealed: true }).status, 'Revealed', 'Describe the confirmed reveal.');
  if (part === 'A') return;
  assert.equal(typeof workflow.submitAction, 'function', 'Export submitAction(state, action, client, notify).');
  let finish, reads = 0, commits = 0;
  const notifications = [];
  const client = { commit: () => { commits++; return new Promise(resolve => { finish = resolve; }); }, readState: async () => { reads++; return { committed: true, revealed: false, phase: 'reveal' }; } };
  const pending = workflow.submitAction(state, 'commit', client, model => notifications.push(model));
  assert.equal(state.pending, true, 'Set pending before awaiting the client.');
  assert.equal(state.committed, false, 'Do not mark committed before confirmation and read-back.');
  await assert.rejects(() => workflow.submitAction(state, 'commit', client, () => {}), undefined, 'Reject a second click while pending.');
  finish(); await pending;
  assert.equal(commits, 1, 'Submit once per accepted action.');
  assert.equal(reads, 1, 'Read confirmed state after the action resolves.');
  assert.equal(state.committed, true, 'Update the UI from confirmed state.');
  assert.equal(state.pending, false, 'Clear pending after completion.');
  assert.ok(notifications.length >= 2, 'Notify the UI on pending and on completion.');
  // Exercise the other action too, so a controller hard-coded to commit cannot pass.
  let reveals = 0;
  await workflow.submitAction(state, 'reveal', {
    reveal: async () => { reveals++; },
    readState: async () => ({ committed: true, revealed: true, phase: 'closed' }),
  }, () => {});
  assert.equal(reveals, 1, 'Call the selected reveal adapter exactly once.');
  assert.equal(state.revealed, true, 'Read back and display the confirmed reveal.');
  const failed = initialView();
  await workflow.submitAction(failed, 'commit', { commit: async () => { throw new Error('private-secret-fixture'); } }, () => {});
  assert.equal(failed.pending, false, 'Clear pending after failure.');
  assert.equal(failed.committed, false, 'A failed request must not claim successful commitment.');
  assert.ok(failed.error && !failed.error.includes('private-secret-fixture'), 'Show a controlled error rather than exposing raw private exception data.');
  if (part === 'B') return;
  const view = await learnerModule(folder, 'view.mjs');
  assert.equal(typeof view.render, 'function', 'Export render(root, model).');
  const nodes = Object.fromEntries(['commit', 'reveal', 'status', 'error'].map(id => [`#${id}`, { disabled: undefined, textContent: '' }]));
  const root = { querySelector: selector => { assert.ok(nodes[selector], `Unexpected view selector ${selector}`); return nodes[selector]; } };
  const model = { canCommit: false, canReveal: true, status: 'Committed', error: 'Test error' };
  view.render(root, model);
  assert.equal(nodes['#commit'].disabled, true); assert.equal(nodes['#reveal'].disabled, false);
  assert.equal(nodes['#status'].textContent, 'Committed'); assert.equal(nodes['#error'].textContent, 'Test error');
  const html = source(folder, 'index.html');
  for (const id of ['commit', 'reveal', 'status', 'error']) assert.match(html, new RegExp(`id=["']${id}["']`), `Include the ${id} element in index.html.`);
  assert.match(html, /aria-live=["']polite["']/, 'Announce asynchronous status changes through a live region.');
  assert.match(html, /type=["']module["']/, 'Load app.mjs as an ES module.');
  source(folder, 'app.mjs');
  run(process.execPath, ['--check', 'app.mjs'], folder);
}
// Grade the known public-receipt scenario; a broader application threat model still needs review.
async function testPrivacy(part, folder) {
  if (part === 'A' || part === 'C') quiz(`19${part}`, folder);
  if (part === 'A') return;
  const { publicReceipt } = await learnerModule(folder, 'receipt.mjs');
  assert.equal(typeof publicReceipt, 'function', 'Export publicReceipt(record).');
  const input = { id: 'public-id', commitment: 'public-commitment', revealed: false, value: 3, secret: 'secret-fixture', salt: 'salt-fixture', privateState: { note: 'private-fixture' } };
  assert.deepEqual(publicReceipt(input), { id: input.id, commitment: input.commitment, revealed: false }, 'Use an explicit public allowlist and omit the sealed value.');
  assert.deepEqual(publicReceipt({ ...input, revealed: true }), { id: input.id, commitment: input.commitment, revealed: true, value: 3 }, 'Include the value only after reveal and keep secrets absent.');
  if (part === 'C') {
    const report = source(folder, 'REVIEW.md');
    assert.ok(!report.includes('TODO'), 'Complete REVIEW.md for the human review checkpoint; remove its TODO placeholders.');
    for (const heading of ['Observers', 'Public linkage', 'Recovery', 'Limits']) assert.ok(report.includes(heading), `Keep the ${heading} section in REVIEW.md.`);
  }
}
// Evaluate the bounded capstone specification using independent inputs and winner-order cases.
export function checkAuction(module, part) {
  const admin = bytes();
  const h = harness(module, { args: [runtime.persistentHash(new runtime.CompactTypeBytes(32), admin)] });
  required(h, ['participantId', 'commitBid']);
  const alice = { secret: bytes(), salt: bytes(), bid: 70n }, bob = { secret: bytes(), salt: bytes(), bid: 90n }, tie = { secret: bytes(), salt: bytes(), bid: 90n };
  assert.equal(h.peek().phase, 0n, 'Start in submission phase.');
  for (const bidder of [alice, bob, tie]) bidder.id = h.call('participantId', bidder.secret);
  assert.notDeepEqual(harness(module, { args: [runtime.persistentHash(new runtime.CompactTypeBytes(32), admin)] }).call('participantId', alice.secret), alice.id, 'Scope bidder IDs to this deployment.');
  for (const invalid of [0n, 1001n]) rejects(() => h.call('commitBid', alice.secret, invalid, alice.salt), 'Enforce the bid range 1–1000.');
  for (const bidder of [alice, bob, tie]) h.call('commitBid', bidder.secret, bidder.bid, bidder.salt);
  rejects(() => h.call('commitBid', alice.secret, 80n, bytes()), 'Reject replacing a bid.');
  assert.equal(h.peek().bids.lookup(alice.id).value, 0n, 'Keep the bid hidden until reveal.');
  if (part === 'A') return;
  required(h, ['startReveal', 'close']);
  if (part === 'C' || part === 'D') {
    required(h, ['revealBid']);
    rejects(() => h.call('revealBid', alice.secret, alice.bid, alice.salt), 'Reject reveals before the organizer starts reveal phase.');
  }
  rejects(() => h.call('startReveal', bytes()), 'Only the organizer may start reveal.');
  rejects(() => h.call('close', admin), 'Do not skip reveal.');
  h.call('startReveal', admin);
  rejects(() => h.call('commitBid', bytes(), 30n, bytes()), 'Reject late bids.');
  rejects(() => h.call('startReveal', admin), 'Reject repeated phase transitions.');
  if (part === 'B') { h.call('close', admin); assert.equal(h.peek().phase, 2n); return; }
  required(h, ['revealBid']);
  rejects(() => h.call('revealBid', alice.secret, 71n, alice.salt), 'Reject changed bid values.');
  rejects(() => h.call('revealBid', alice.secret, alice.bid, bytes()), 'Reject changed salts.');
  rejects(() => h.call('revealBid', bytes(), alice.bid, alice.salt), 'A different secret cannot open Alice’s record.');
  assert.equal(h.peek().revealedCount, 0n, 'Rejected openings must not affect the result.');
  for (const bidder of [alice, bob, tie]) h.call('revealBid', bidder.secret, bidder.bid, bidder.salt);
  assert.equal(h.peek().highest, 90n, 'Choose the greatest revealed bid.');
  assert.deepEqual(h.peek().winner, bob.id, 'Equal bids keep the first successfully revealed winner.');
  assert.equal(h.peek().revealedCount, 3n, 'Count each valid reveal exactly once.');
  rejects(() => h.call('revealBid', bob.secret, bob.bid, bob.salt), 'Reject replay.');
  rejects(() => h.call('close', bytes()), 'Only the organizer may close the auction.');
  h.call('close', admin);
  rejects(() => h.call('revealBid', alice.secret, alice.bid, alice.salt), 'Reject reveals after closure.');
  assert.equal(h.peek().highest, 90n, 'Closure preserves the result.');
}
// Dispatch the full project lessons without treating a planning document as executable proof.
export async function projectCheck(id, folder) {
  const lesson = Number(id.slice(0, -1)), part = id.at(-1);
  if (lesson === 16) return testTesting(part, folder);
  if (lesson === 17) return testNotebook(part, folder);
  if (lesson === 18) return testInterface(part, folder);
  if (lesson === 19) return testPrivacy(part, folder);
  const module = await compile(folder, 'auction.compact', 'managed/auction');
  checkAuction(module, part);
  if (part === 'D') {
    probe(folder, 'run-auction.mjs', "__exerciseAssert.equal(typeof state, 'function', 'Expose state() to inspect the demo result.'); __exerciseAssert.equal(state().phase, 2n); __exerciseAssert.equal(state().highest, 90n); __exerciseAssert.equal(state().revealedCount, 2n);");
    assert.ok(!source(folder, 'DESIGN.md').includes('TODO'), 'Complete DESIGN.md before submitting the capstone for human review.');
  }
}
