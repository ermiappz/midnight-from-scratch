// Use the shared local network identity and service endpoints.
import './config.js';
// Resolve generated artifact directories relative to this module's file location.
import { fileURLToPath } from 'node:url';
// Associate the generated contract class with the artifacts used for proving.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
// Load the contract compiled for this example, rather than a learner's stale build.
import { Contract } from '../managed/feedback/contract/index.js';
// Expose the generated decoder and class to the deployment and call scripts.
export { ledger, Contract } from '../managed/feedback/contract/index.js';
export type Circuit = 'participantId' | 'commitFor' | 'revealFor';
// Locate proving artifacts relative to this module rather than the shell directory.
export const assets = fileURLToPath(new URL('../managed/feedback', import.meta.url));
// Associate the generated contract with the witnesses and artifacts used for proving.
export const compiled = CompiledContract.withCompiledFileAssets(
  // Declare that this contract needs no witness callbacks and attach its compiled artifacts.
  CompiledContract.withVacantWitnesses(CompiledContract.make('feedback', Contract)), assets,
);
