// Use assertions so an unexpected result fails the command instead of only printing.
import assert from 'node:assert/strict';
// Load the runtime expected by compiler 0.31.1's generated JavaScript.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Import this lesson's freshly compiled output, independent of learner files.
import { Contract, ledger } from './managed/contract/index.js';
// Run each callback against an independent context so attempts cannot share mutations.
function attempt(supplied) {
  // Keep the saved preference at four in every experiment.
  const privateState = { preferredRating: 4n };
  // Model a caller replacing the callback's answer without changing its notebook.
  const contract = new Contract({
    // Return the original state but choose the value supplied to Compact.
    preferredRating: ({ privateState }) => [privateState, supplied],
  });
  // Use a local placeholder, as in the preceding simulations.
  const coinPublicKey = '0'.repeat(64);
  // Start this experiment with new contract state.
  const initial = contract.initialState(runtime.createConstructorContext(privateState, coinPublicKey));
  // Build the environment that the generated wrapper expects.
  const context = runtime.createCircuitContext(runtime.sampleContractAddress(), coinPublicKey, initial.currentContractState, privateState);
  // Make five the last successful public rating before testing the witness.
  const rated = contract.circuits.setRating(context, 5n);
  // Return the objects needed to test either acceptance or rejection.
  return { contract, rated };
}
// A caller-chosen two is different from the saved preference but inside the rule.
const valid = attempt(2n);
// Request that caller-controlled witness value through the circuit.
const applied = valid.contract.circuits.applyPreferredRating(valid.rated.context);
// The circuit accepts two because it checks the range, not the notebook's truth.
assert.equal(ledger(applied.context.currentQueryContext.state).rating, 2n);
// The local saved preference remains four because the callback preserved it.
assert.equal(applied.context.currentPrivateState.preferredRating, 4n);
// Repeat with an input that violates an actual circuit constraint.
const invalid = attempt(6n);
// Replacing the callback cannot make six satisfy the circuit's range assertion.
assert.throws(() => invalid.contract.circuits.applyPreferredRating(invalid.rated.context), /Rating must be 1 to 5/);
// The rejected attempt must leave the last successful public rating at five.
assert.equal(ledger(invalid.rated.context.currentQueryContext.state).rating, 5n);
// State the exact claim the two experiments support.
console.log('Callback 2 accepted with private preference 4; callback 6 rejected');
