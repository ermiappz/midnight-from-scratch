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
// Invoke the circuit without passing a rating argument; its witness supplies one.
const applied = contract.circuits.applyPreferredRating(context);
// Verify that the circuit deliberately published the validated preference.
assert.equal(ledger(applied.context.currentQueryContext.state).rating, 4n);
// Returning the same witness state leaves its local preference unchanged.
assert.equal(applied.context.currentPrivateState.preferredRating, 4n);
// Make the private-to-public path explicit in this learning output.
console.log('Witness preference: 4; public rating: 4');
