// Use assertions so an unexpected result fails the command instead of only printing.
import assert from 'node:assert/strict';
// Load the runtime expected by compiler 0.31.1's generated JavaScript.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Import this lesson's freshly compiled output, independent of learner files.
import { Contract, ledger } from './managed/contract/index.js';
// This contract has no witness declarations at this stage.
const contract = new Contract({});
// Begin with empty local private state; it is not public ledger state.
const privateState = {};
// Supply the local simulator's identity placeholder, not a real funded wallet.
const coinPublicKey = '0'.repeat(64);
// Construct a new in-memory state for this run rather than deploying on-chain.
const initial = contract.initialState(runtime.createConstructorContext(privateState, coinPublicKey));
// Combine the address, caller identity and initial state into the circuit's environment.
const context = runtime.createCircuitContext(
  runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, privateState,
);
// Store five stars to create the first case for the Boolean-returning circuit.
const five = contract.circuits.setRating(context, 5n);
// Demonstrate that writing a rating still returns [] as the application value.
assert.deepEqual(five.result, []);
// Read the stored rating through the circuit's return statement.
const read = contract.circuits.readRating(five.context);
// Inspect .result for the answer rather than confusing it with .context.
assert.equal(read.result, 5n);
// A stored five should produce the Boolean true.
assert.equal(contract.circuits.isFiveStars(read.context).result, true);
// Use the returned context to replace the public rating with four.
const four = contract.circuits.setRating(read.context, 4n);
// Four should produce false without changing the rating.
assert.equal(contract.circuits.isFiveStars(four.context).result, false);
// Check the ledger independently of the circuit's returned answer.
assert.equal(ledger(four.context.currentQueryContext.state).rating, 4n);
// Show both Boolean cases after checking them.
console.log('readRating: 5; isFiveStars: true at 5, false at 4');
