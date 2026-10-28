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
// Confirm that a fresh string ledger field starts empty.
assert.equal(ledger(context.currentQueryContext.state).message, '');
// Supply the message as an explicit circuit argument.
const saved = contract.circuits.storeMessage(context, 'Hello Midnight');
// Decode the state returned by the call rather than reading the old context.
assert.equal(ledger(saved.context.currentQueryContext.state).message, 'Hello Midnight');
// Confirm that [] denotes no application return value, even though context was returned.
assert.deepEqual(saved.result, []);
// Display the observed change after checking it.
console.log('Message: empty -> Hello Midnight');
