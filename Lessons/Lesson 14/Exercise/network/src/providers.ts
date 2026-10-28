// Use the shared local network identity and service endpoints.
import { endpoints } from './config.js';
// Read confirmed state through the indexer provider.
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
// Load generated circuit artifacts from the local filesystem.
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
// Request proofs from the configured HTTP proof server.
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
// Persist encrypted application state and deployment signing keys locally.
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
// Check that the adapter satisfies the SDK's provider interfaces.
import type { WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';

// Assemble the independent services required to execute this contract over the network.
export function providersFor<Circuit extends string>(bridge: WalletProvider & MidnightProvider, assets: string) {
  // Read the private-store password without placing it in tracked source.
  const password = process.env.PRIVATE_STATE_PASSWORD;
  // Require a configured storage password before constructing the private-state provider.
  if (!password || password.length < 32) throw new Error('Set PRIVATE_STATE_PASSWORD to at least 32 characters');
  // Load the matching circuit and key files from the generated artifact directory.
  const zkConfigProvider = new NodeZkConfigProvider<Circuit>(assets);
  // Create durable encrypted local storage for the contract's private-state namespace.
  const privateStateProvider = levelPrivateStateProvider<'course', Record<string, never>>({
    // Use a stable store name so a later process can find the same data.
    privateStateStoreName: '.private-state/data',
    // Keep deployment maintenance keys separate from application entries.
    signingKeyStoreName: '.private-state/signing',
    // Supply the password used by the provider's encryption facility.
    privateStoragePasswordProvider: () => password,
    // Separate stored data belonging to different wallet identities.
    accountId: bridge.getCoinPublicKey(),
  });
  // Return the provider bundle used by deployment and transaction helpers.
  return {
    // Include the private-store adapter in the provider bundle.
    privateStateProvider,
    // Read confirmed state through the indexer rather than local guesses.
    publicDataProvider: indexerPublicDataProvider(endpoints.indexer, endpoints.indexerWS),
    // Reuse the same circuit artifacts when the SDK requests proving configuration.
    zkConfigProvider,
    // Send proving requests to the configured local proof server.
    proofProvider: httpClientProofProvider(endpoints.proof, zkConfigProvider),
    // Provide key access and transaction balancing through the wallet adapter.
    walletProvider: bridge,
    // Provide network submission through the same wallet adapter.
    midnightProvider: bridge,
  };
}
