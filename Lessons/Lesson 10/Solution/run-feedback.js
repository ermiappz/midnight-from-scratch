// Make unexpected results fail the runner instead of merely printing them.
import assert from 'node:assert/strict';
// Generate unpredictable secrets and salts with Node's cryptographic RNG.
import { randomBytes } from 'node:crypto';
// Use the runtime compatible with the generated contract.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Load the contract compiled for this example, rather than a learner's stale build.
import { Contract, ledger } from './managed/feedback/contract/index.js';

// Instantiate the generated contract with the callbacks it requires.
const contract = new Contract({});
// Provide the local runner's identity placeholder; it is not proof of record ownership.
const coinPublicKey = '0'.repeat(64);
// Construct fresh local contract state for this independent run.
const initial = contract.initialState(
  runtime.createConstructorContext({}, coinPublicKey),
);
// Carry address, identity and current state into the generated circuit wrapper.
let context = runtime.createCircuitContext(
  runtime.sampleContractAddress(),
  coinPublicKey,
  initial.currentContractState,
  {},
);

// Keep a fresh authorization secret local to this participant.
const aliceSecret = new Uint8Array(randomBytes(32));
// Ask the contract to derive the identifier from the same rule it enforces.
const aliceId = contract.circuits.participantId(context, aliceSecret);
// Carry the successful call's state forward instead of restarting from an old context.
context = aliceId.context;

// Name the intended rating so subsequent calls reuse the same choice.
const aliceChoice = 3n;
// Retain secret randomness so the committed choice can be opened later.
const aliceSalt = new Uint8Array(randomBytes(32));
// Keep the call's answer and returned context for the next observation or operation.
const aliceCommit = contract.circuits.commitFor(
  context, aliceSecret, aliceChoice, aliceSalt,
);
// Carry the successful call's state forward instead of restarting from an old context.
context = aliceCommit.context;

// Decode the current public state before inspecting its fields.
const sealed = ledger(context.currentQueryContext.state).submissions.lookup(aliceId.result);
// Ensure commit stores only the sealed record and its unrevealed placeholder.
assert.equal(sealed.revealed, false);
// Fail if a commit accidentally publishes the rating before reveal.
assert.equal(sealed.value, 0n);
// Display the observed value at this stage of the example.
console.log('Revealed:', sealed.revealed);
// Display the observed value at this stage of the example.
console.log('Stored value:', sealed.value.toString());

// Keep the call's answer and returned context for the next observation or operation.
const aliceReveal = contract.circuits.revealFor(
  context, aliceId.result, aliceSecret, aliceChoice, aliceSalt,
);
// Carry the successful call's state forward instead of restarting from an old context.
context = aliceReveal.context;

// Decode the current public state before inspecting its fields.
const aliceRecord = ledger(context.currentQueryContext.state).submissions.lookup(aliceId.result);
// Verify that a matching opening publishes Alice's original rating.
assert.equal(aliceRecord.value, aliceChoice);
// Verify the flag that prevents this record from being opened again.
assert.equal(aliceRecord.revealed, true);
// Display the observed value at this stage of the example.
console.log('Alice:', aliceRecord.value.toString());

// Keep a fresh authorization secret local to this participant.
const bobSecret = new Uint8Array(randomBytes(32));
// Retain secret randomness so the committed choice can be opened later.
const bobSalt = new Uint8Array(randomBytes(32));
// Name the intended rating so subsequent calls reuse the same choice.
const bobChoice = 5n;

// Ask the contract to derive the identifier from the same rule it enforces.
const bobId = contract.circuits.participantId(context, bobSecret);
// Carry the successful call's state forward instead of restarting from an old context.
context = bobId.context;

// Keep the call's answer and returned context for the next observation or operation.
const bobCommit = contract.circuits.commitFor(
  context, bobSecret, bobChoice, bobSalt,
);
// Carry the successful call's state forward instead of restarting from an old context.
context = bobCommit.context;

// Verify rejection so an invalid operation cannot silently pass the example.
assert.throws(() => {
  // Invoke the circuit under test using the arguments of this experiment.
  contract.circuits.revealFor(
    context, bobId.result, aliceSecret, bobChoice, bobSalt,
  );
}, /Not the owner/);
// Display the observed value at this stage of the example.
console.log('Different secret rejected.');

// Keep the call's answer and returned context for the next observation or operation.
const bobReveal = contract.circuits.revealFor(
  context, bobId.result, bobSecret, bobChoice, bobSalt,
);
// Carry the successful call's state forward instead of restarting from an old context.
context = bobReveal.context;

// Decode the current public state before inspecting its fields.
const finalState = ledger(context.currentQueryContext.state);
// Verify that Bob's independent record contains his own original rating.
assert.equal(finalState.submissions.lookup(bobId.result).value, bobChoice);
// Ensure Bob's update did not replace Alice's record.
assert.equal(finalState.submissions.lookup(aliceId.result).value, aliceChoice);
// Verify that both participant records coexist in the map.
assert.equal(finalState.submissions.size(), 2n);
// Display the observed value at this stage of the example.
console.log('Bob:', finalState.submissions.lookup(bobId.result).value.toString());
// Display the observed value at this stage of the example.
console.log('Participants:', finalState.submissions.size().toString());
