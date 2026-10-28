// Grade contract behavior using fresh state and independent inputs.
import { assert, runtime, bytes, compile, harness, withWitness, required, rejects, probe, json, source, run } from './helpers.mjs';
// Keep the short concept questions next to their checkpoint definitions.
import { questions } from './catalog.mjs';

// Check only the named stage's answers; later blank answers must not block early progress.
export function quiz(id, folder) {
  const answers = json(folder, 'answers.json')[id];
  assert.ok(answers, `Add the ${id} answers in answers.json.`);
  for (const [key, [expected, prompt]] of Object.entries(questions[id])) {
    assert.notEqual(answers[key], null, `${key}: ${prompt}`);
    assert.deepEqual(answers[key], expected, `${key}: revisit this question: ${prompt}`);
  }
}
// Ensure package edits select the runtime and module format actually used in the lesson.
function manifest(folder, scripts = []) {
  const pkg = json(folder, 'package.json');
  assert.equal(pkg.type, 'module', 'Add "type": "module" to this exercise’s package.json.');
  assert.equal(pkg.dependencies?.['@midnight-ntwrk/compact-runtime'], '0.16.0', 'Declare the exact Compact runtime dependency 0.16.0.');
  for (const name of scripts) assert.equal(typeof pkg.scripts?.[name], 'string', `Add the ${name} npm script to this exercise’s manifest.`);
  return pkg;
}
// Inspect a read-only circuit independently of whatever the learner prints.
function checkRead(h, boolean = false) {
  required(h, ['setRating', boolean ? 'isFiveStars' : 'readRating']);
  for (const value of [1n, 4n, 5n]) {
    h.call('setRating', value);
    assert.equal(h.call(boolean ? 'isFiveStars' : 'readRating'), boolean ? value === 5n : value, 'Return the answer derived from the current stored rating.');
    assert.equal(h.peek().rating, value, 'Reading a value must not change the stored rating.');
  }
}
// Test a one-slot commitment at the point where each operation has been introduced.
function checkCommit(module, reveal, boundaries = false) {
  const h = withWitness(module);
  required(h, ['commitRating', ...(reveal ? ['revealRating'] : [])]);
  const salt = bytes();
  if (reveal) rejects(() => h.call('revealRating', 3n, salt), 'Reject reveal before commit.');
  for (const invalid of [0n, 6n, 256n]) rejects(() => h.call('commitRating', invalid, salt), 'Reject ratings outside 1–5.');
  h.call('commitRating', 3n, salt);
  assert.equal(h.peek().hasCommitment, true, 'Mark a successful commitment as occupied.');
  assert.equal(h.peek().hasRevealed, false, 'A commitment must not count as a reveal.');
  assert.equal(h.peek().revealedRating, 0n, 'Do not publish the choice during commit.');
  assert.equal(h.peek().ratingCommitment.length, 32, 'Store the typed 32-byte commitment.');
  rejects(() => h.call('commitRating', 5n, bytes()), 'Reject replacing an occupied commitment.');
  if (!reveal) return;
  const commitment = new Uint8Array(h.peek().ratingCommitment);
  rejects(() => h.call('revealRating', 5n, salt), 'Reject a different valid choice with the original salt.');
  const changed = new Uint8Array(salt); changed[0] ^= 1;
  rejects(() => h.call('revealRating', 3n, changed), 'Reject a changed salt.');
  assert.equal(h.peek().hasRevealed, false, 'A rejected opening must leave the entry unopened.');
  assert.deepEqual(h.peek().ratingCommitment, commitment, 'A rejected opening must retain the original commitment.');
  h.call('revealRating', 3n, salt);
  assert.equal(h.peek().revealedRating, 3n, 'Publish the original choice after a matching opening.');
  assert.equal(h.peek().hasRevealed, true, 'Mark the successful reveal.');
  rejects(() => h.call('revealRating', 3n, salt), 'Reject repeated reveal.');
  if (boundaries) assert.equal(h.peek().revealedRating, 3n, 'Replay rejection must retain the accepted choice.');
}
// Exercise the evolving map interface without demanding future-stage circuits early.
export function checkParticipants(module, part) {
  const h = harness(module);
  if (part === 'A') {
    required(h, ['storeRating']);
    h.call('storeRating', 1n, 3n); h.call('storeRating', 2n, 5n);
    assert.equal(h.peek().submissions.lookup(1n), 3n, 'Keep Alice’s map entry when adding Bob.');
    assert.equal(h.peek().submissions.lookup(2n), 5n, 'Store Bob under his own key.');
    return;
  }
  required(h, ['participantId', part === 'B' ? 'storeRating' : 'commitFor']);
  const secret = bytes(), other = bytes(), salt = bytes();
  const id = h.call('participantId', secret), otherId = h.call('participantId', other);
  assert.equal(id.length, 32, 'Return a 32-byte participant identifier.');
  assert.deepEqual(h.call('participantId', secret), id, 'The same secret and contract must produce the same ID.');
  assert.notDeepEqual(otherId, id, 'Different secrets must select independent records.');
  if (part === 'B') {
    h.call('storeRating', secret, 3n); h.call('storeRating', other, 5n);
    assert.equal(h.peek().submissions.lookup(id), 3n, 'Derive the record key from the supplied secret.');
    return;
  }
  for (const invalid of [0n, 6n]) rejects(() => h.call('commitFor', secret, invalid, salt), 'Constrain the rating before inserting a record.');
  h.call('commitFor', secret, 3n, salt);
  const sealed = h.peek().submissions.lookup(id);
  assert.equal(sealed.value, 0n, 'Store the placeholder before reveal.');
  assert.equal(sealed.revealed, false, 'Store the unrevealed flag.');
  rejects(() => h.call('commitFor', secret, 4n, salt), 'Reject duplicate commitment for this ID.');
  if (part === 'C') return;
  required(h, ['revealFor']);
  rejects(() => h.call('revealFor', id, other, 3n, salt), 'Reject a different owner secret.');
  rejects(() => h.call('revealFor', id, secret, 5n, salt), 'Reject a mismatched opening.');
  h.call('revealFor', id, secret, 3n, salt);
  assert.equal(h.peek().submissions.lookup(id).value, 3n, 'Reveal the original choice in the original record.');
  rejects(() => h.call('revealFor', id, secret, 3n, salt), 'Reject replay.');
  if (part === 'F') {
    const another = harness(module);
    assert.notDeepEqual(another.call('participantId', secret), id, 'Include the contract address in keyFor: the same secret must differ across deployments.');
  }
}
// Set up a round without sharing mutable state between test attempts.
export function makeRound(module) {
  const admin = bytes();
  const organizer = runtime.persistentHash(new runtime.CompactTypeBytes(32), admin);
  const h = harness(module, { args: [organizer] });
  const alice = { secret: bytes(), salt: bytes(), choice: 3n };
  const bob = { secret: bytes(), salt: bytes(), choice: 5n };
  return { h, admin, organizer, alice, bob, outsider: bytes() };
}
// Test the public project specification rather than matching a particular implementation's source text.
export function checkRound(module, part) {
  const { h, admin, organizer, alice, bob, outsider } = makeRound(module);
  assert.equal(h.peek().phase, 0n, 'Initialize the round in submission phase 0.');
  assert.deepEqual(h.peek().organizer, organizer, 'Retain the organizer identifier passed to the constructor.');
  assert.equal(h.peek().total, 0n, 'Start with no revealed rating total.');
  assert.equal(h.peek().revealedCount, 0n, 'Start with no reveals.');
  if (part === 'B') return;
  required(h, ['participantId', 'admit', 'submit']);
  alice.id = h.call('participantId', alice.secret); bob.id = h.call('participantId', bob.secret);
  rejects(() => h.call('admit', outsider, alice.id), 'Only the organizer may admit a member.');
  rejects(() => h.call('submit', outsider, 3n, bytes()), 'Unadmitted callers must be rejected.');
  for (const person of [alice, bob]) h.call('admit', admin, person.id);
  rejects(() => h.call('admit', admin, alice.id), 'Reject duplicate admission.');
  for (const invalid of [0n, 6n, 256n]) rejects(() => h.call('submit', alice.secret, invalid, alice.salt), 'Apply the valid rating range.');
  for (const person of [alice, bob]) h.call('submit', person.secret, person.choice, person.salt);
  rejects(() => h.call('submit', alice.secret, 4n, bytes()), 'Reject duplicate submission.');
  assert.equal(h.peek().entries.lookup(alice.id).value, 0n, 'Keep submissions sealed.');
  if (part === 'C') return;
  required(h, ['startReveal', 'reveal', 'close']);
  rejects(() => h.call('reveal', alice.id, alice.secret, 3n, alice.salt), 'Reject reveals during submission.');
  rejects(() => h.call('startReveal', outsider), 'Only the organizer may advance the phase.');
  rejects(() => h.call('close', admin), 'Do not skip the reveal phase.');
  h.call('startReveal', admin);
  rejects(() => h.call('admit', admin, bytes()), 'Close admissions when reveal starts.');
  rejects(() => h.call('submit', bytes(), 3n, bytes()), 'Close submissions when reveal starts.');
  rejects(() => h.call('reveal', alice.id, bob.secret, 3n, alice.salt), 'Require the owner secret.');
  rejects(() => h.call('reveal', alice.id, alice.secret, 5n, alice.salt), 'Require the original rating.');
  const wrongSalt = new Uint8Array(alice.salt); wrongSalt[0] ^= 1;
  rejects(() => h.call('reveal', alice.id, alice.secret, 3n, wrongSalt), 'Require the original salt.');
  assert.equal(h.peek().total, 0n, 'Rejected openings cannot increase the total.');
  assert.equal(h.peek().entries.lookup(alice.id).revealed, false, 'Rejected openings cannot mark a record revealed.');
  for (const person of [alice, bob]) h.call('reveal', person.id, person.secret, person.choice, person.salt);
  rejects(() => h.call('reveal', alice.id, alice.secret, 3n, alice.salt), 'Reject repeated reveal.');
  assert.equal(h.peek().total, 8n, 'Sum each revealed rating once.');
  assert.equal(h.peek().revealedCount, 2n, 'Count two successful reveals.');
  rejects(() => h.call('close', outsider), 'Only the organizer may close the round.');
  h.call('close', admin);
  assert.equal(h.peek().phase, 2n, 'Enter the closed phase.');
  rejects(() => h.call('reveal', bob.id, bob.secret, 5n, bob.salt), 'Closed rounds cannot be reopened.');
}

// Select only the requirements introduced at the requested learning stage.
export async function localCheck(id, folder) {
  const lesson = Number(id.slice(0, -1)), part = id.at(-1);
  if (questions[id]) quiz(id, folder);
  if (lesson === 1) {
    const p = json(folder, 'package.json');
    assert.equal(typeof p.name, 'string', 'Add a project name to package.json.');
    assert.ok(p.name.trim(), 'Use a nonempty project name.');
    assert.equal(p.private, true, 'Set private to true to prevent npm publication.');
    return;
  }
  if (lesson === 3 && part === 'A') { manifest(folder); return; }
  if (lesson === 8 && part === 'A') return;
  if (lesson === 9 && part === 'A') return;
  if (lesson === 15 && part === 'A') return;
  if (lesson === 11) {
    const p = manifest(folder, ['compile:feedback', 'feedback', 'check:feedback']);
    assert.match(p.scripts['compile:feedback'], /compact.*feedback\.compact/, 'Point compile:feedback at this exercise’s feedback.compact.');
    assert.match(p.scripts.feedback, /node.*run-feedback\.js/, 'Run this exercise’s feedback runner.');
    assert.match(p.scripts['check:feedback'], /compile:feedback.*&&.*feedback/, 'Compile successfully before running feedback.');
    if (part === 'A') return;
    const lock = json(folder, 'package-lock.json');
    assert.equal(lock.packages?.['']?.dependencies?.['@midnight-ntwrk/compact-runtime'], p.dependencies['@midnight-ntwrk/compact-runtime'], 'Generate a lockfile matching this manifest.');
    if (part === 'B') return;
    run('npm', ['run', 'check:feedback'], folder);
    checkParticipants(await compile(folder, 'feedback.compact', 'managed/feedback'), 'F');
    return;
  }
  const file = lesson === 10 ? 'feedback.compact' : lesson === 15 ? 'round.compact' : 'hello.compact';
  const output = lesson === 10 ? 'managed/feedback' : lesson === 15 ? 'managed/round' : 'managed/hello';
  const module = await compile(folder, file, output);
  if (lesson === 15) {
    checkRound(module, part === 'E' ? 'D' : part);
    if (part === 'E') probe(folder, 'run-round.js', "__exerciseAssert.equal(typeof state, 'function', 'Expose state() to inspect the runner’s final ledger.'); __exerciseAssert.equal(state().phase, 2n); __exerciseAssert.equal(state().total, 8n); __exerciseAssert.equal(state().revealedCount, 2n);");
    return;
  }
  if (lesson === 10) {
    checkParticipants(module, part);
    const inspected = part === 'A' ? 'ledger(context.currentQueryContext.state).submissions.lookup(1n)' : part === 'B' ? 'ledger(context.currentQueryContext.state).submissions.lookup(aliceId.result)' : 'ledger(context.currentQueryContext.state).submissions.lookup(aliceId.result).value';
    const expected = part === 'C' ? 0n : 3n;
    probe(folder, 'run-feedback.js', `__exerciseAssert.equal(${inspected}, ${expected}n, 'Complete the runner experiment for ${id}.');` + (part === 'E' || part === 'F' ? "__exerciseAssert.equal(ledger(context.currentQueryContext.state).submissions.lookup(bobId.result).value, 5n, 'Complete Bob’s reveal.');" : ''));
    return;
  }
  if (lesson === 2) {
    const h = harness(module);
    assert.equal(h.peek().message, '', 'Declare the public string ledger field message.');
    if (part === 'B') {
      required(h, ['storeMessage']); h.call('storeMessage', 'Stage 2B');
      assert.equal(h.peek().message, 'Stage 2B', 'Store the supplied message, not a fixed string.');
    }
    return;
  }
  if (lesson === 3) {
    const check = "__exerciseAssert.ok(typeof context !== 'undefined', 'Construct context in run.js.'); __exerciseAssert.equal(typeof contract.circuits.storeMessage, 'function');";
    probe(folder, 'run.js', check + (part === 'B' ? '' : "__exerciseAssert.ok(typeof result !== 'undefined', 'Retain the storeMessage result in result.'); __exerciseAssert.notEqual(ledger(result.context.currentQueryContext.state).message, '', 'Store a nonempty message.'); __exerciseAssert.deepEqual(result.result, []);"));
    if (part === 'D') assert.equal(harness(module).peek().message, '', 'A fresh state starts empty.');
    return;
  }
  if (lesson === 4) {
    const h = harness(module); assert.equal(h.peek().edits, 0n, 'Declare the edits counter.');
    if (part === 'A') return;
    h.call('storeMessage', 'Repeated'); h.call('storeMessage', 'Repeated');
    assert.equal(h.peek().edits, 2n, 'Increment once per successful call, including identical messages.');
    if (part === 'C' || part === 'D') probe(folder, 'run.js', "__exerciseAssert.ok(typeof result2 !== 'undefined', 'Add the second call as result2.'); __exerciseAssert.equal(ledger(result2.context.currentQueryContext.state).edits, 2n, 'Pass result.context to the second call.');");
    if (part === 'D') {
      const pkg = manifest(folder, ['start', 'compile-compact']);
      assert.match(pkg.scripts.start, /node.*run\.js/, 'Point start at this exercise’s run.js.');
      assert.match(pkg.scripts['compile-compact'], /compact.*hello\.compact/, 'Compile this exercise’s hello.compact.');
      run('npm', ['run', 'compile-compact'], folder);
      run('npm', ['start'], folder);
    }
    return;
  }
  if (lesson === 5) {
    const h = harness(module); assert.equal(h.peek().rating, 0n, 'Declare the public rating field.');
    if (part === 'A') return;
    required(h, ['setRating']); h.call('setRating', 4n);
    assert.equal(h.peek().rating, 4n, 'Store the supplied valid rating.');
    for (const invalid of [0n, 6n, 256n]) rejects(() => h.call('setRating', invalid), `Reject rating ${invalid}.`);
    assert.equal(h.peek().rating, 4n, 'Rejected ratings must leave the last valid rating intact.');
    if (part === 'C' || part === 'D') probe(folder, 'run.js', "__exerciseAssert.ok(typeof rated !== 'undefined', 'Retain the valid setRating call as rated.'); __exerciseAssert.equal(ledger(rated.context.currentQueryContext.state).rating, 4n);");
    return;
  }
  if (lesson === 6) {
    checkRead(harness(module), part === 'C');
    if (part === 'B') probe(folder, 'run.js', "__exerciseAssert.ok(typeof read !== 'undefined', 'Append readRating and retain its result as read.'); __exerciseAssert.equal(read.result, 5n, 'Set the earlier rating to 5n before reading.');");
    return;
  }
  if (lesson === 7 || lesson === 8) {
    assert.match(source(folder, 'managed/hello/contract/index.d.ts'), /preferredRating/, 'Declare the preferredRating witness.');
    if (lesson === 7 && part === 'A') return;
    const h = withWitness(module, 2n); required(h, ['applyPreferredRating']);
    h.call('applyPreferredRating'); assert.equal(h.peek().rating, 2n, 'Use the witness-supplied value, not a hard-coded preference.');
    rejects(() => withWitness(module, 6n).call('applyPreferredRating'), 'Constrain witness values to 1–5.');
    if (lesson === 7 && part === 'B') return;
    const value = lesson === 8 && part === 'B' ? 2 : lesson === 8 && part === 'C' ? 6 : 4;
    // Stage 8C deliberately makes the final call throw; remove only that experiment for the callback probe.
    if (lesson === 8 && part === 'C') {
      const text = source(folder, 'run.js');
      assert.match(text, /6n/, 'Try returning 6n in the callback and catching the rejected call.');
      probe(folder, 'run.js', "__exerciseAssert.equal(witnesses.preferredRating({ privateState: { preferredRating: 4n } })[1], 6n, 'Supply 6n from the witness for this experiment.');");
    } else {
      probe(folder, 'run.js', `__exerciseAssert.ok(typeof witnesses !== 'undefined', 'Define the witnesses callback object.'); const __tuple = witnesses.preferredRating({ privateState: { preferredRating: 4n } }); __exerciseAssert.equal(__tuple[1], ${value}n); __exerciseAssert.equal(__tuple[0].preferredRating, 4n);` + (lesson === 7 && part === 'D' ? "__exerciseAssert.equal(ledger(applied.context.currentQueryContext.state).rating, 4n); __exerciseAssert.equal(applied.context.currentPrivateState.preferredRating, 4n);" : ''));
    }
    return;
  }
  if (lesson === 9) {
    checkCommit(module, part !== 'B', part === 'F');
    if (['D', 'E', 'F'].includes(part)) probe(folder, 'run.js', "__exerciseAssert.ok(typeof opened !== 'undefined', 'Append the original opening’s reveal and keep its result as opened.'); __exerciseAssert.equal(ledger(committed.context.currentQueryContext.state).revealedRating, 0n); __exerciseAssert.equal(ledger(opened.context.currentQueryContext.state).revealedRating, 3n);");
    return;
  }
  throw new Error(`No local check registered for ${id}.`);
}
