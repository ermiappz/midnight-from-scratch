// Use the shared local network identity and service endpoints.
import './config.js';
// Make unexpected results fail the runner instead of merely printing them.
import assert from 'node:assert/strict';
// Generate unpredictable secrets and salts with Node's cryptographic RNG.
import { randomBytes } from 'node:crypto';
// Read or persist deployment and opening records across process runs.
import { writeFile } from 'node:fs/promises';
// Resolve generated artifact directories relative to this module's file location.
import { fileURLToPath } from 'node:url';
// Use the SDK helpers that deploy or reconnect to compiled contracts.
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
// Associate the generated contract class with the artifacts used for proving.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
// Use the runtime compatible with the generated contract.
import * as runtime from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
// Load the contract compiled for this example, rather than a learner's stale build.
import { Contract, ledger } from '../managed/round/contract/index.js';
// Reuse the local wallet setup and DUST readiness check.
import { openLocalWallet, waitForDust } from './wallet.js';
// Connect the contract to public data, proving, private storage and wallet services.
import { providersFor } from './providers.js';

// Restrict provider requests to this contract's actual exported circuit names.
type Circuit = 'participantId' | 'admit' | 'submit' | 'startReveal' | 'reveal' | 'close';
// Locate proving artifacts relative to this module rather than the shell directory.
const assets = fileURLToPath(new URL('../managed/round', import.meta.url));
// Associate the generated contract with the witnesses and artifacts used for proving.
const compiled = CompiledContract.withCompiledFileAssets(
  // Declare that this contract needs no witness callbacks and attach its compiled artifacts.
  CompiledContract.withVacantWitnesses(CompiledContract.make('round', Contract)), assets,
);
// Create independent random bytes each time a secret or salt is needed.
const bytes = () => new Uint8Array(randomBytes(32));
// Keep a fresh authorization secret local to this participant.
const admin = bytes();
// Keep a fresh authorization secret local to this participant.
const secret = bytes();
// Retain secret randomness so the committed choice can be opened later.
const salt = bytes();
// Compute the public organizer identifier using the same typed hash as Compact.
const organizer = runtime.persistentHash(new runtime.CompactTypeBytes(32), admin);
// Open the local wallet and retain the capabilities this script uses.
const { wallet, bridge } = await openLocalWallet();
// Connect this contract to its wallet, indexer, prover and private storage.
const providers = providersFor<Circuit>(bridge, assets);
// Keep cleanup or expected-error handling active if the operation throws.
try {
  // Wait for fee resources before requesting a transaction.
  await waitForDust(wallet);
  // Store before the first transaction; the file contains secrets, not just an address.
  await writeFile('round-deployment.json', JSON.stringify({
    // Serialize the original secrets before making network calls that depend on them.
    admin: Array.from(admin), secret: Array.from(secret), salt: Array.from(salt), choice: '3',
  }), { mode: 0o600, flag: 'wx' });
  // Deploy the compiled contract and wait for its confirmed deployment record.
  const deployed = await deployContract(providers, {
    // Supply the round constructor's organizer hash and initialize empty application private state.
    compiledContract: compiled, privateStateId: 'course', initialPrivateState: {}, args: [organizer],
  });
  // Retain the real confirmed address for subsequent calls and read-back.
  const address = deployed.deployTxData.public.contractAddress;
  // Display the observed value at this stage of the example.
  console.log('Round confirmed:', address);
  // Preserve the record needed to recover or reconnect after this process exits.
  await writeFile('round-deployment.json', JSON.stringify({
    // Associate the saved opening and organizer secret with the confirmed round address.
    address, admin: Array.from(admin), secret: Array.from(secret), salt: Array.from(salt), choice: '3',
  }), { mode: 0o600 });
  // Read indexed contract state to check what the network actually recorded.
  const before = await providers.publicDataProvider.queryContractState(address);
  // Stop if the indexer cannot supply the contract state needed for this check.
  if (!before) throw new Error('Round not found');
  // Use this deployment's real address and queried state for local ID derivation.
  const ctx = runtime.createCircuitContext(address, bridge.getCoinPublicKey(), before, {});
  // Ask the contract to derive the identifier from the same rule it enforces.
  const id = new Contract({}).impureCircuits.participantId(ctx, secret).result;
  // Submit this authorized operation and wait for the SDK's confirmation result.
  await deployed.callTx.admit(admin, id);
  // Submit this authorized operation and wait for the SDK's confirmation result.
  await deployed.callTx.submit(secret, 3n, salt);
  // Submit this authorized operation and wait for the SDK's confirmation result.
  await deployed.callTx.startReveal(admin);
  // Submit this authorized operation and wait for the SDK's confirmation result.
  await deployed.callTx.reveal(id, secret, 3n, salt);
  // Ask the organizer to close the round and wait for confirmation.
  const closed = await deployed.callTx.close(admin);
  // Display the observed value at this stage of the example.
  console.log('Close confirmed:', closed.public.txId, closed.public.blockHeight);
  // Read indexed contract state to check what the network actually recorded.
  const after = await providers.publicDataProvider.queryContractState(address);
  // Stop if the indexer cannot supply the contract state needed for this check.
  if (!after) throw new Error('Round not found after close');
  // Keep the call's answer and returned context for the next observation or operation.
  const result = ledger(after.data);
  // Check the observed result so a regression fails this example.
  assert.equal(result.phase, 2n);
  // Check the observed result so a regression fails this example.
  assert.equal(result.total, 3n);
  // Check the observed result so a regression fails this example.
  assert.equal(result.revealedCount, 1n);
  // Display the observed value at this stage of the example.
  console.log('Confirmed closed round: 1 revealed rating, total 3');
} finally {
  // Close wallet connections and subscriptions even when the operation fails.
  await wallet.stop();
}
