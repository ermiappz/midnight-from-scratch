// Use the shared local network identity and service endpoints.
import { endpoints, networkId } from './config.js';
// Import the wallet facade, key derivation and sub-wallet implementations.
import {
  WalletFacade, ShieldedWallet, DustWallet, UnshieldedWallet,
  PublicKey, HDWallet, Roles, createKeystore, InMemoryTransactionHistoryStorage,
  WalletEntrySchema, mergeWalletEntries,
} from '@midnight-ntwrk/wallet-sdk';
// Construct wallet key roles using the SDK's matching ledger implementation.
import { DustSecretKey, ZswapSecretKeys, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
// Check that the adapter satisfies the SDK's provider interfaces.
import type { WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
// Observe wallet readiness with a condition and a bounded wait.
import { firstValueFrom, filter, timeout } from 'rxjs';

// Prepare one synchronized local wallet and the adapters needed by contract calls.
export async function openLocalWallet() {
  // The introductory runner must never silently submit using a public-network profile.
  if (networkId !== 'undeployed') throw new Error('Use the session command for public networks; this runner is local only');
  return openConfiguredWallet();
}

// Public sessions require a participant-owned seed; the local default is only a fixture.
export async function openConfiguredWallet(options: { registrationOnly?: boolean } = {}) {
  const supplied = process.env.WALLET_SEED;
  if (networkId !== 'undeployed' && !supplied) throw new Error('Set your own WALLET_SEED for this public-network session');
  const seedHex = supplied ?? ('0'.repeat(63) + '1');
  if (!/^(?:[a-f0-9]{64}|[a-f0-9]{128})$/i.test(seedHex)) throw new Error('WALLET_SEED must contain 32 or 64 bytes in hex');
  if (networkId !== 'undeployed' && /^0+1$/i.test(seedHex)) throw new Error('The public local-genesis seed cannot be used on a public network');
  const seed = Buffer.from(seedHex, 'hex');
  // Initialize deterministic key derivation from the chosen wallet seed.
  const hd = HDWallet.fromSeed(seed);
  // Stop if the seed cannot initialize deterministic key derivation.
  if (hd.type !== 'seedOk') throw new Error('Invalid local seed');
  // Derive the distinct key roles used by the three sub-wallets.
  const derived = hd.hdWallet.selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  // Stop before using keys when role derivation failed.
  if (derived.type !== 'keysDerived') throw new Error('Could not derive local keys');
  // Clear the derivation object after obtaining the role keys needed by the wallet.
  hd.hdWallet.clear();
  // Build the key object used to authorize shielded wallet operations.
  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  // Build the separate key object used to authorize fee spends.
  const dustSecretKey = DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
  // Keep unshielded signing capability behind the wallet keystore interface.
  const keystore = createKeystore(derived.keys[Roles.NightExternal], networkId);
  // Construct the wallet with one consistent network and set of key roles.
  const wallet = await WalletFacade.init({
    // Give every sub-wallet the same network services and transaction settings.
    configuration: {
      // Use the local network identifier selected by config.ts.
      networkId,
      // Connect wallet queries and subscriptions to the same indexer.
      indexerClientConnection: { indexerHttpUrl: endpoints.indexer, indexerWsUrl: endpoints.indexerWS },
      // Send wallet proving requests to the local proof service.
      provingServerUrl: new URL(endpoints.proof),
      // Submit transactions through the local node connection.
      relayURL: new URL(endpoints.nodeWS),
      // Keep this demo's transaction history in memory for the current process.
      txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
      // Reserve fee overhead and a block margin for the demo transactions.
      costParameters: { additionalFeeOverhead: options.registrationOnly ? 0n : 300_000_000_000_000n, feeBlocksMargin: 5 },
    },
    // Initialize the sub-wallet that tracks shielded state.
    shielded: cfg => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    // Initialize the sub-wallet that tracks public token state.
    unshielded: cfg => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
    // Initialize the sub-wallet responsible for fee resources.
    dust: cfg => DustWallet(cfg).startWithSecretKey(dustSecretKey, LedgerParameters.initialParameters().dust),
  });
  // Keep cleanup or expected-error handling active if the operation throws.
  try {
    // Begin wallet synchronization using the appropriate private keys.
    await wallet.start(shieldedSecretKeys, dustSecretKey);
    // Wait for synchronization and fail after three minutes instead of waiting forever.
    await firstValueFrom(wallet.state().pipe(filter(s => s.isSynced), timeout({ first: 180_000 })));
  } catch (error) {
    // Close wallet connections and subscriptions even when the operation fails.
    await wallet.stop();
    // Propagate the original failure after completing cleanup.
    throw error;
  }
  // Adapt wallet capabilities to the interfaces expected by Midnight.js.
  const bridge: WalletProvider & MidnightProvider = {
    // Expose the public shielded identity required by the SDK.
    getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
    // Expose the public encryption key without returning secret key material.
    getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
    // Let the wallet add the funding and fee material required by this transaction.
    balanceTx: async tx => {
      // Ask the wallet to assemble the balancing material for this transaction.
      const recipe = await wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys, dustSecretKey }, {
        // Limit how long the prepared transaction may remain valid.
        ttl: new Date(Date.now() + 30 * 60_000),
      });
      // Add the required unshielded signatures before finalizing the recipe.
      const signed = await wallet.signRecipe(recipe, bytes => keystore.signData(bytes));
      // Finalize the balanced, signed material before network submission.
      return wallet.finalizeRecipe(signed);
    },
    // Submit the finalized transaction through the wallet's node connection.
    submitTx: tx => wallet.submitTransaction(tx),
  };
  // Expose lifecycle control, contract adapters and the public-address accessor.
  return { wallet, bridge, keystore };
}

// Wait until the wallet has synchronized and has the demo fee allowance.
export async function waitForDust(wallet: WalletFacade) {
  // A readiness check, not a promise that every possible transaction is affordable.
  return firstValueFrom(wallet.state().pipe(
    // Select synchronized wallet states with enough DUST for this demo's readiness threshold.
    filter(s => s.isSynced && s.dust.balance(new Date()) >= 1_000_000_000_000_000n),
    // Report stalled readiness instead of keeping the process waiting indefinitely.
    timeout({ first: 180_000 }),
  ));
}
