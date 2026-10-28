// Make unexpected results fail the runner instead of merely printing them.
import assert from 'node:assert/strict';
// Generate unpredictable secrets and salts with Node's cryptographic RNG.
import { randomBytes } from 'node:crypto';
// Use the runtime compatible with the generated contract.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Load the contract compiled for this example, rather than a learner's stale build.
import { Contract, ledger } from './managed/round/contract/index.js';

// Create independent random bytes each time a secret or salt is needed.
const bytes = () => new Uint8Array(randomBytes(32));
// Keep a fresh authorization secret local to this participant.
const adminSecret = bytes();
// Match the constructor's public identifier to the private organizer secret.
const organizerId = runtime.persistentHash(new runtime.CompactTypeBytes(32), adminSecret);
// Instantiate the generated contract with the callbacks it requires.
const contract = new Contract({});
// Provide the local runner's identity placeholder; it is not proof of record ownership.
const coinPublicKey = '0'.repeat(64);
// Construct fresh local contract state for this independent run.
const initial = contract.initialState(runtime.createConstructorContext({}, coinPublicKey), organizerId);
// Carry address, identity and current state into the generated circuit wrapper.
let context = runtime.createCircuitContext(runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, {});
// Reuse the last successful context while keeping test calls short.
function call(name, ...args) {
  // Keep the call's answer and returned context for the next observation or operation.
  const result = contract.impureCircuits[name](context, ...args);
  // Carry the successful call's state forward instead of restarting from an old context.
  context = result.context;
  // Return the application answer after the helper has advanced the execution context.
  return result.result;
}
// Decode the current public state before inspecting its fields.
const state = () => ledger(context.currentQueryContext.state);
// Group this participant's local secret, opening and choice for the experiment.
const alice = { secret: bytes(), salt: bytes(), choice: 3n };
// Group this participant's local secret, opening and choice for the experiment.
const bob = { secret: bytes(), salt: bytes(), choice: 5n };
// Give the unauthorized caller a different secret for the rejection checks.
const outsider = bytes();
// Derive Alice's record identifier with the contract's own rule.
alice.id = call('participantId', alice.secret);
// Derive Bob's independent identifier before admission or submission.
bob.id = call('participantId', bob.secret);
// Check the observed result so a regression fails this example.
assert.equal(state().phase, 0n);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('admit', outsider, alice.id), /Not organizer/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('submit', outsider, 3n, bytes()), /Not admitted/);
// Let the organizer authorize a participant before submissions close.
call('admit', adminSecret, alice.id);
// Let the organizer authorize a participant before submissions close.
call('admit', adminSecret, bob.id);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('admit', adminSecret, alice.id), /Already admitted/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('submit', alice.secret, 6n, alice.salt), /Rating must be 1 to 5/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('submit', alice.secret, 256n, alice.salt), /type error/);
// Accept one eligible participant's hidden rating during the submission phase.
call('submit', alice.secret, alice.choice, alice.salt);
// Accept one eligible participant's hidden rating during the submission phase.
call('submit', bob.secret, bob.choice, bob.salt);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('submit', alice.secret, 4n, bytes()), /Already submitted/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, alice.salt), /Reveal not open/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('close', adminSecret), /Wrong phase/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('startReveal', outsider), /Not organizer/);
// Allow the organizer to advance the round into its reveal phase.
call('startReveal', adminSecret);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('startReveal', adminSecret), /Wrong phase/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('admit', adminSecret, bytes()), /Admissions closed/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('submit', alice.secret, 4n, alice.salt), /Submission closed/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', alice.id, bob.secret, alice.choice, alice.salt), /Not the owner/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', alice.id, alice.secret, 4n, alice.salt), /Wrong opening/);
// Copy the salt before changing it so the original opening remains usable.
const wrongSalt = new Uint8Array(alice.salt);
// Change a copied opening while preserving the original salt for a valid reveal.
wrongSalt[0] ^= 1;
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, wrongSalt), /Wrong opening/);
// Check the observed result so a regression fails this example.
assert.equal(state().total, 0n);
// Open an authorized, unrevealed entry only during the allowed phase.
call('reveal', alice.id, alice.secret, alice.choice, alice.salt);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, alice.salt), /Already revealed/);
// Open an authorized, unrevealed entry only during the allowed phase.
call('reveal', bob.id, bob.secret, bob.choice, bob.salt);
// Freeze the round against further reveals after the organizer closes it.
call('close', adminSecret);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('close', adminSecret), /Wrong phase/);
// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => call('reveal', bob.id, bob.secret, bob.choice, bob.salt), /Reveal not open/);
// Check the observed result so a regression fails this example.
assert.equal(state().phase, 2n);
// Check the observed result so a regression fails this example.
assert.equal(state().total, 8n);
// Check the observed result so a regression fails this example.
assert.equal(state().revealedCount, 2n);
// Display the observed value at this stage of the example.
console.log('Closed phase:', state().phase.toString());
// Display the observed value at this stage of the example.
console.log('Revealed:', state().revealedCount.toString());
// Display the observed value at this stage of the example.
console.log('Total:', state().total.toString());
// Display the observed value at this stage of the example.
console.log('Average:', Number(state().total) / Number(state().revealedCount));
// Display the observed value at this stage of the example.
console.log('Phase, admission, authorization, range, opening and replay checks passed.');
