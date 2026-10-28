// Use the runtime required by the generated contract.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Read this exercise's generated interface, never the reference solution.
import { Contract, ledger } from './managed/hello/contract/index.js';
// Keep the preference in the local private notebook.
const privateState = { preferredRating: 4n };
// Implement the callback declared in the Compact source.
const witnesses = {
  // Preserve the notebook and supply its current preference to Compact.
  preferredRating: ({ privateState }) => [privateState, privateState.preferredRating],
};
// Register the callback before any circuit requests its value.
const contract = new Contract(witnesses);
// Supply a dummy identity for this local simulation.
const coinPublicKey = '0'.repeat(64);
// Construct fresh in-memory state for this run.
const initial = contract.initialState(runtime.createConstructorContext(privateState, coinPublicKey));
// Carry state and caller information into the first circuit call.
const context = runtime.createCircuitContext(runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, privateState);
// Pass the first message through the circuit's explicit argument.
const result = contract.impureCircuits.storeMessage(context, 'Hello Midnight');
// Inspect returned state rather than assuming the old context changed.
console.log('After:', ledger(result.context.currentQueryContext.state).message);
// Continue from the first result so the counter reaches two.
const result2 = contract.impureCircuits.storeMessage(result.context, 'Hello Midnight');
// Format the counter for the terminal.
console.log('Edits:', ledger(result2.context.currentQueryContext.state).edits.toString());
// Supply a valid initial rating before exploring returned answers.
const rated = contract.impureCircuits.setRating(result2.context, 5n);
// Observe the public rating accepted by the contract.
console.log('Rating:', ledger(rated.context.currentQueryContext.state).rating.toString());
// Ask the circuit for its application answer using the last successful context.
const read = contract.impureCircuits.readRating(rated.context);
// Keep the returned answer distinct from execution metadata.
console.log('Read:', read.result.toString());
// Let the circuit request the value through its witness rather than an argument.
const applied = contract.impureCircuits.applyPreferredRating(read.context);
// Observe the validated value deliberately copied into public state.
console.log('Applied rating:', ledger(applied.context.currentQueryContext.state).rating.toString());

// TODO: Extend this runner as each stage requests; retain the last successful context.
