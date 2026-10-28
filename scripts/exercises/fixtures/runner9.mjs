// Completed lesson 9 fixture for checker regression tests.
// General execution helpers from the package you just installed.
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { randomBytes } from 'node:crypto';
// Your own contract, translated into JavaScript by the compiler.
import { Contract, ledger } from './managed/hello/contract/index.js';

// Keep this public preference distinct from the sealed choice below.
const privateState = { preferredRating: 4n };

const witnesses = {
  preferredRating: ({ privateState }) => [privateState, privateState.preferredRating],
};

// Register the callback declared by the Compact witness.
const contract = new Contract(witnesses);

// Dummy identity for local execution; this is not a real wallet or secret key.
const coinPublicKey = '0'.repeat(64);

// Construct the initial contract state in memory; this does not deploy it.
const initial = contract.initialState(
  runtime.createConstructorContext(privateState, coinPublicKey),
);

// Assemble the environment that the compiled circuit expects.
const context = runtime.createCircuitContext(
  runtime.sampleContractAddress(), // Dummy address, not a deployed contract.
  coinPublicKey,
  initial.currentContractState,
  privateState,
);

// ledger() translates the runtime's state representation into readable fields.
console.log('Before:', JSON.stringify(ledger(context.currentQueryContext.state).message));
console.log('Edits before:', ledger(context.currentQueryContext.state).edits.toString());

// The second JS argument becomes the Compact newMessage argument.
const result = contract.impureCircuits.storeMessage(context, 'I called my own contract');

// Inspect the updated state returned from execution.
console.log('After:', JSON.stringify(ledger(result.context.currentQueryContext.state).message));
console.log('Edits after:', ledger(result.context.currentQueryContext.state).edits.toString());

// Carry the first call's updated state into the second call.
const result2 = contract.impureCircuits.storeMessage(result.context, 'I called my own contract again');
console.log('Edits after second call:', ledger(result2.context.currentQueryContext.state).edits.toString());

// 5n is a bigint: it fits Uint<8> AND the circuit's 1..5 rule.
// rated.context is now our last successful state (two messages and rating 5).
const rated = contract.impureCircuits.setRating(result2.context, 5n);

const isFivestars = contract.circuits.isFiveStars(rated.context);
console.log('Is five stars?', isFivestars.result);

// This is a JavaScript loop, not a Compact circuit loop.
// 0n and 6n fail the assert; 256n fails the generated input-range check.
for (const invalidRating of [0n, 6n, 256n]) {
  try {
    // Test each rejection against the last SUCCESSFUL context.
    // A throwing call returns no new execution result to carry forward.
    contract.impureCircuits.setRating(rated.context, invalidRating);
    throw new Error(`Unexpected acceptance of rating ${invalidRating}`);
  } catch (error) {
    // Only display the expected validation errors; don't mask an accepted input.
    if (error.message.startsWith('Unexpected acceptance')) throw error;
    console.log(`Rejected ${invalidRating}:`, error.message);
  }
}

// The assert precedes the write, so these rejected calls leave rating at 5.
console.log(
  'Rating:',
  ledger(rated.context.currentQueryContext.state).rating.toString(),
);
// No explicit Compact inputs: only the latest successful execution context.
const read = contract.impureCircuits.readRating(rated.context);
// .result is the circuit's Uint<8> return value, represented as a JS bigint.
console.log('Read rating:', read.result.toString());

const applied = contract.impureCircuits.applyPreferredRating(read.context);
// The witness supplies the stored preference; the circuit enforces 1..5.
console.log('Applied rating:', ledger(applied.context.currentQueryContext.state).rating.toString());
console.log('Preference in private state:', applied.context.currentPrivateState.preferredRating.toString());

const opening = {
  choice: 3n,
  salt: new Uint8Array(randomBytes(32)),
};

const committed = contract.impureCircuits.commitRating(applied.context, opening.choice, opening.salt);
const sealedState = ledger(committed.context.currentQueryContext.state);

console.log('Has commitment:', sealedState.hasCommitment);
console.log('Commitment bytes:', sealedState.ratingCommitment.length);
console.log('Commitment hex:', Buffer.from(sealedState.ratingCommitment).toString('hex'));
console.log('Revealed before opening:', sealedState.hasRevealed);
console.log('Rating before opening:', sealedState.revealedRating.toString());


function expectRejected(label, action, expectedMessage) {
  try {
    action();
  } catch (error) {
    if (!error.message.includes(expectedMessage)) throw error;
    console.log(`${label}:`, error.message);
    return;
  }
  throw new Error(`${label}: unexpectedly accepted`);
}

expectRejected('Second commitment', () => {
  contract.impureCircuits.commitRating(committed.context, 5n, opening.salt);
}, 'Rating already committed');

const wrongSalt = new Uint8Array(opening.salt);
wrongSalt[0] ^= 1; // Flip one bit in the copy; keep the original intact.
expectRejected('Wrong salt', () => {
  contract.impureCircuits.revealRating(committed.context, opening.choice, wrongSalt);
}, 'Opening does not match commitment');

const retained = ledger(committed.context.currentQueryContext.state);
console.log('Still unopened:', retained.hasRevealed === false); // true
console.log('Still placeholder:', retained.revealedRating === 0n); // true

expectRejected('Wrong choice', () => {
  contract.impureCircuits.revealRating(committed.context, 5n, opening.salt);
}, 'Opening does not match commitment');

// Continue from the last successful context after the failed attempt.
const opened = contract.impureCircuits.revealRating(
  committed.context,
  opening.choice,
  opening.salt,
);
const openedState = ledger(opened.context.currentQueryContext.state);
console.log('Revealed after opening:', openedState.hasRevealed);
console.log('Revealed rating:', openedState.revealedRating.toString());
console.log('Earlier public rating:', openedState.rating.toString());
console.log('Edits:', openedState.edits.toString());

expectRejected('Second reveal', () => {
  contract.impureCircuits.revealRating(opened.context, opening.choice, opening.salt);
}, 'Rating already revealed');
