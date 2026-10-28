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
// Establish one successful state to retain across rejected attempts.
const rated = contract.circuits.setRating(context, 4n);
// Verify that a valid application rating was stored.
assert.equal(ledger(rated.context.currentQueryContext.state).rating, 4n);
// Zero fits Uint<8> but is outside the application's range.
assert.throws(() => contract.circuits.setRating(rated.context, 0n), /Rating must be 1 to 5/);
// Six also fits the type but fails the same application rule.
assert.throws(() => contract.circuits.setRating(rated.context, 6n), /Rating must be 1 to 5/);
// 256 fails the generated argument type check before the circuit body runs.
assert.throws(() => contract.circuits.setRating(rated.context, 256n), /type error/);
// The assertions precede writes, so the successful rating is retained.
assert.equal(ledger(rated.context.currentQueryContext.state).rating, 4n);
// Report the distinction between accepted and rejected inputs.
console.log('Rating 4 accepted; 0, 6 and 256 rejected; retained rating 4');
