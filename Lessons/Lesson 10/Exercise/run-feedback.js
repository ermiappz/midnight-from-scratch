// Use the runtime required by the generated contract.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Read this exercise's generated interface, never the reference solution.
import { Contract, ledger } from './managed/feedback/contract/index.js';
// Start with no witness callbacks until lesson 7 introduces them.
const contract = new Contract({});
// Keep private application state separate from the public ledger.
const privateState = {};
// Supply a dummy identity for this local simulation.
const coinPublicKey = '0'.repeat(64);
// Construct fresh in-memory state for this run.
const initial = contract.initialState(runtime.createConstructorContext(privateState, coinPublicKey));
// Carry state and caller information into the first circuit call.
let context = runtime.createCircuitContext(runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, privateState);

// TODO 10A: Append Alice's storeRating call and read her map entry.
