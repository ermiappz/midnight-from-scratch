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
// Check the initial counter before either message call.
assert.equal(ledger(context.currentQueryContext.state).edits, 0n);
// Make the first successful call against the initial state.
const first = contract.circuits.storeMessage(context, 'Same message');
// Verify that one successful call increments once.
assert.equal(ledger(first.context.currentQueryContext.state).edits, 1n);
// Carry forward the first result so the second call does not restart at zero.
const second = contract.circuits.storeMessage(first.context, 'Same message');
// Repeating identical text still counts as a second successful call.
assert.equal(ledger(second.context.currentQueryContext.state).edits, 2n);
// Make the state sequence visible after verifying it.
console.log('Edits: 0 -> 1 -> 2');
