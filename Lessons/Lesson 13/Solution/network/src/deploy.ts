// Read or persist deployment and opening records across process runs.
import { writeFile } from 'node:fs/promises';
// Use the SDK helpers that deploy or reconnect to compiled contracts.
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
// Reuse the local wallet setup and DUST readiness check.
import { openLocalWallet, waitForDust } from './wallet.js';
// Connect the contract to public data, proving, private storage and wallet services.
import { providersFor } from './providers.js';
// Use the feedback contract's generated interface and matching artifacts.
import { compiled, assets, type Circuit } from './feedback.js';
// Open the local wallet and retain the capabilities this script uses.
const { wallet, bridge } = await openLocalWallet();
// Connect this contract to its wallet, indexer, prover and private storage.
const providers = providersFor<Circuit>(bridge, assets);
// Keep cleanup or expected-error handling active if the operation throws.
try {
  // Wait for fee resources before requesting a transaction.
  await waitForDust(wallet);
  // Deploy the compiled contract and wait for its confirmed deployment record.
  const deployed = await deployContract(providers, {
    // Choose the compiled interface and start its application private state empty.
    compiledContract: compiled, privateStateId: 'course', initialPrivateState: {},
  });
  // Retain the real confirmed address for subsequent calls and read-back.
  const address = deployed.deployTxData.public.contractAddress;
  // Preserve the record needed to recover or reconnect after this process exits.
  await writeFile('deployment.json', JSON.stringify({ address, network: 'undeployed' }, null, 2));
  // Display the observed value at this stage of the example.
  console.log('Confirmed deployment:', address);
} finally {
  // Close wallet connections and subscriptions even when the operation fails.
  await wallet.stop();
}
