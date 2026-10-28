// Use Node's cryptographic RNG for the commitment's secret opening.
import { randomBytes } from 'node:crypto';
// Use assertions so an unexpected result fails the command instead of only printing.
import assert from 'node:assert/strict';
// Load the runtime expected by compiler 0.31.1's generated JavaScript.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Import this lesson's freshly compiled output, independent of learner files.
import { Contract, ledger } from './managed/contract/index.js';
// Put the preference in local memory for the witness to read.
const privateState = { preferredRating: 4n };
// Register the JS implementation under the name declared in Compact.
const contract = new Contract({
  // Preserve local state and supply its preference as the separate witness value.
  preferredRating: ({ privateState }) => [privateState, privateState.preferredRating],
});
// Use a dummy identity for local execution rather than a real wallet.
const coinPublicKey = '0'.repeat(64);
// Initialize the contract with the local private-state object.
const initial = contract.initialState(runtime.createConstructorContext(privateState, coinPublicKey));
// Supply the same private state to the first circuit's execution context.
const context = runtime.createCircuitContext(
  runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, privateState,
);
// Generate a fresh private opening instead of a predictable shared salt.
const salt = new Uint8Array(randomBytes(32));
// A reveal cannot precede the existence of a commitment.
assert.throws(() => contract.circuits.revealRating(context, 3n, salt), /No rating committed/);
// Bind choice three to this salt while leaving revealedRating at its placeholder.
const committed = contract.circuits.commitRating(context, 3n, salt);
// The ledger must not contain the raw choice before a matching reveal.
assert.equal(ledger(committed.context.currentQueryContext.state).revealedRating, 0n);
// A second commit cannot replace the choice to which this slot is bound.
assert.throws(() => contract.circuits.commitRating(committed.context, 5n, salt), /Rating already committed/);
// A different valid rating must fail commitment matching, not just the range rule.
assert.throws(() => contract.circuits.revealRating(committed.context, 5n, salt), /Opening does not match/);
// Copy before changing a salt so the original opening remains usable.
const wrongSalt = new Uint8Array(salt);
// Flip one bit to produce a definitely different opening.
wrongSalt[0] ^= 1;
// Changing the salt also invalidates the opening.
assert.throws(() => contract.circuits.revealRating(committed.context, 3n, wrongSalt), /Opening does not match/);
// Failed checks occur before writes, so the record must remain unopened.
assert.equal(ledger(committed.context.currentQueryContext.state).hasRevealed, false);
// Supply the original choice and salt to pass the commitment comparison.
const revealed = contract.circuits.revealRating(committed.context, 3n, salt);
// Read the successfully disclosed choice from the returned public state.
assert.equal(ledger(revealed.context.currentQueryContext.state).revealedRating, 3n);
// The revealed flag must block using the same opening twice.
assert.throws(() => contract.circuits.revealRating(revealed.context, 3n, salt), /Rating already revealed/);
// Summarize the state transition that was actually checked.
console.log('Sealed placeholder 0 -> revealed 3; wrong and repeated openings rejected');
