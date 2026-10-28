// Make unexpected results fail the runner instead of merely printing them.
import assert from 'node:assert/strict';
// Generate unpredictable secrets and salts with Node's cryptographic RNG.
import { randomBytes } from 'node:crypto';
// Read or persist deployment and opening records across process runs.
import { readFile, writeFile } from 'node:fs/promises';
// Use the SDK helpers that deploy or reconnect to compiled contracts.
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
// Use the runtime compatible with the generated contract.
import * as runtime from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
// Reuse the local wallet setup and DUST readiness check.
import { openLocalWallet, waitForDust } from './wallet.js';
// Connect the contract to public data, proving, private storage and wallet services.
import { providersFor } from './providers.js';
// Use the feedback contract's generated interface and matching artifacts.
import { compiled, assets, Contract, ledger, type Circuit } from './feedback.js';

// Recover the previously confirmed deployment address from the local record.
const saved = JSON.parse(await readFile('deployment.json', 'utf8'));
// Reject a deployment record for another network or a malformed contract address.
if (saved.network !== 'undeployed' || !/^[a-f0-9]{64}$/i.test(saved.address)) throw new Error('Invalid local deployment record');
// Open the local wallet and retain the capabilities this script uses.
const { wallet, bridge } = await openLocalWallet();
// Connect this contract to its wallet, indexer, prover and private storage.
const providers = providersFor<Circuit>(bridge, assets);
// Keep cleanup or expected-error handling active if the operation throws.
try {
  // Wait for fee resources before requesting a transaction.
  await waitForDust(wallet);
  // Reconnect to the saved deployment through the configured providers.
  const deployed = await findDeployedContract(providers, {
    // Pair the compiled interface with the existing deployment address.
    compiledContract: compiled, contractAddress: saved.address,
    // Use the same private-state namespace when reconnecting to this contract.
    privateStateId: 'course', initialPrivateState: {},
  });
  // Keep a fresh authorization secret local to this participant.
  const secret = new Uint8Array(randomBytes(32));
  // Retain secret randomness so the committed choice can be opened later.
  const salt = new Uint8Array(randomBytes(32));
  // Keep the chosen rating available for both commit and reveal.
  const choice = 3n;
  // Fail if a previous opening exists: inspect/recover it before another attempt.
  await writeFile('opening.json', JSON.stringify({
    // Store the original secret, salt and choice with the deployment they belong to.
    address: saved.address, secret: Array.from(secret), salt: Array.from(salt), choice: choice.toString(),
  }), { mode: 0o600, flag: 'wx' });
  // Derive the ID locally using the ACTUAL deployment address and queried state.
  const before = await providers.publicDataProvider.queryContractState(saved.address);
  // Stop if the indexer cannot supply the contract state needed for this check.
  if (!before) throw new Error('Contract not found');
  // Carry address, identity and current state into the generated circuit wrapper.
  const context = runtime.createCircuitContext(saved.address, bridge.getCoinPublicKey(), before, {});
  // Ask the contract to derive the identifier from the same rule it enforces.
  const id = new Contract({}).impureCircuits.participantId(context, secret).result;
  // Submit the commitment and wait for the confirmed call result.
  const committed = await deployed.callTx.commitFor(secret, choice, salt);
  // Display the observed value at this stage of the example.
  console.log('Commit confirmed:', committed.public.txId, committed.public.blockHeight);
  // Read indexed contract state to check what the network actually recorded.
  const sealed = await providers.publicDataProvider.queryContractState(saved.address);
  // Stop if the indexer cannot supply the contract state needed for this check.
  if (!sealed) throw new Error('Contract not found after commit');
  // Check the observed result so a regression fails this example.
  assert.equal(ledger(sealed.data).submissions.lookup(id).revealed, false);
  // Submit the original opening and wait for the confirmed reveal result.
  const revealed = await deployed.callTx.revealFor(id, secret, choice, salt);
  // Display the observed value at this stage of the example.
  console.log('Reveal confirmed:', revealed.public.txId, revealed.public.blockHeight);
  // Read indexed contract state to check what the network actually recorded.
  const after = await providers.publicDataProvider.queryContractState(saved.address);
  // Stop if the indexer cannot supply the contract state needed for this check.
  if (!after) throw new Error('Contract not found after reveal');
  // Check the observed result so a regression fails this example.
  assert.equal(ledger(after.data).submissions.lookup(id).value, 3n);
  // Display the observed value at this stage of the example.
  console.log('Confirmed revealed rating: 3');
} finally {
  // Close wallet connections and subscriptions even when the operation fails.
  await wallet.stop();
}
