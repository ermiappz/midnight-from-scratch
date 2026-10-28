// Select the environment before importing network-dependent contract helpers.
import { networkId } from './config.js';
// Keep participant openings across commands with restrictive filesystem permissions.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
// Separate records by network, participant, and contract deployment.
import { join } from 'node:path';
// Generate independent authorization secrets and commitment salts.
import { randomBytes } from 'node:crypto';
// Connect to an existing deployment or create a fresh one through the SDK.
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
// Use the matching runtime to derive the application participant ID locally.
import * as runtime from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
// Identify NIGHT coins eligible for fee-resource registration.
import { nativeToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
// Use the same reviewed wallet/provider adapters as the introductory network example.
import { openConfiguredWallet, waitForDust } from './wallet.js';
import { providersFor } from './providers.js';
import { compiled, assets, Contract, ledger, type Circuit } from './feedback.js';

// Errors can contain provider URLs; keep project tokens out of terminal logs.
process.on('uncaughtException', error => {
  const token = process.env.BLOCKFROST_PROJECT_ID;
  let message = error.message.replace(/project_id=[^&\s"']+/g, 'project_id=REDACTED');
  if (token) message = message.split(token).join('REDACTED');
  console.error(message);
  process.exitCode = 1;
});

// Validate arguments before opening connections or submitting any transaction.
const [action, rating] = process.argv.slice(2);
const actions = ['info', 'register-dust', 'deploy', 'read', 'commit', 'reveal'];
if (!actions.includes(action) || (action !== 'commit' && rating !== undefined) || process.argv.length > 4) throw new Error('Usage: session <info|register-dust|deploy|read|commit 1..5|reveal>');
if (action === 'commit' && !/^[1-5]$/.test(rating ?? '')) throw new Error('Choose one whole-number rating from 1 to 5');
// Require a deliberate opt-in for commands that can submit production transactions.
if (networkId === 'mainnet' && ['register-dust', 'deploy', 'commit', 'reveal'].includes(action) && process.env.MAINNET_TRANSACTIONS !== 'enabled') throw new Error('Set MAINNET_TRANSACTIONS=enabled only after completing the production release review');
// Reject a malformed shared address before opening network connections.
if (process.env.CONTRACT_ADDRESS && !/^[a-f0-9]{64}$/i.test(process.env.CONTRACT_ADDRESS)) throw new Error('CONTRACT_ADDRESS must be the confirmed 64-hex-character address');
// Each participant keeps a separate notebook even when testing from one machine.
const participant = process.env.COURSE_PARTICIPANT ?? 'alice';
if (!/^[a-z0-9-]{1,32}$/.test(participant)) throw new Error('COURSE_PARTICIPANT must use 1–32 lowercase letters, digits, or hyphens');
const directory = join('.course-sessions', networkId, participant);
await mkdir(directory, { recursive: true, mode: 0o700 });
// Print only fixed labels; provider URLs can contain access tokens.
console.log('Network:', networkId, '| Participant:', participant);
const { wallet, bridge, keystore } = await openConfiguredWallet({ registrationOnly: action === 'register-dust' });
try {
  // Inspect wallet readiness without requiring fee resources just to print its address.
  if (action === 'info' || action === 'register-dust') {
    const state = await wallet.waitForSyncedState();
    console.log('Unshielded address:', keystore.getBech32Address().toString());
    console.log('Synchronized:', state.isSynced);
    console.log('DUST (SPECK):', state.dust.balance(new Date()).toString());
    if (action === 'register-dust') {
      // Register only eligible NIGHT coins; this operation funds its registration fee.
      const coins = state.unshielded.availableCoins.filter(coin => coin.utxo.type === nativeToken().raw && coin.meta.registeredForDustGeneration === false);
      if (!coins.length) throw new Error('No unregistered NIGHT coins. Fund this address or inspect existing registrations first');
      // Wait until these NIGHT coins can cover their registration fee.
      const estimate = await wallet.estimateRegistration(coins);
      await wallet.waitForGeneratedDust(coins, estimate.fee, { timeoutMs: 180_000 });
      const recipe = await wallet.registerNightUtxosForDustGeneration(coins, keystore.getPublicKey(), payload => keystore.signData(payload));
      const tx = await wallet.finalizeRecipe(recipe);
      console.log('Registration submitted:', await wallet.submitTransaction(tx));
      console.log('Run info again after indexing; wait for DUST before deploying.');
    }
  } else {
    // Contract operations use this wallet's encrypted store and the selected environment.
    const providers = providersFor<Circuit>(bridge, assets);
    const deploymentFile = join(directory, 'deployment.json');
    if (action === 'deploy') {
      // Refuse to overwrite the participant's deployment receipt on a rerun.
      try { await readFile(deploymentFile); throw new Error('A deployment receipt exists. Read and reconcile it before another deployment'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await waitForDust(wallet);
      const result = await deployContract(providers, { compiledContract: compiled, privateStateId: 'course', initialPrivateState: {} });
      const address = result.deployTxData.public.contractAddress;
      // This receipt is public data; private provider storage remains local.
      await writeFile(deploymentFile, JSON.stringify({ network: networkId, address }, null, 2), { flag: 'wx', mode: 0o600 });
      console.log('Confirmed address:', address);
      console.log('Share only this address plus the network and source revision.');
    } else {
      // A peer joins by providing the same public contract address on the same network.
      const saved = process.env.CONTRACT_ADDRESS ? { network: networkId, address: process.env.CONTRACT_ADDRESS } : JSON.parse(await readFile(deploymentFile, 'utf8'));
      if (saved.network !== networkId || !/^[a-f0-9]{64}$/i.test(saved.address)) throw new Error('Deployment address/network mismatch');
      const address: string = saved.address;
      const openingFile = join(directory, `${address}.opening.json`);
      const state = await providers.publicDataProvider.queryContractState(address);
      if (!state) throw new Error('No indexed contract at this address on this network');
      // Match the expected public schema before using the deployment.
      const publicState = ledger(state.data);
      if (!publicState.submissions) throw new Error('The contract does not expose feedback submissions');
      if (action === 'read') {
        console.log('Contract is indexed:', address);
        try {
          const opening = JSON.parse(await readFile(openingFile, 'utf8'));
          const ctx = runtime.createCircuitContext(address, bridge.getCoinPublicKey(), state, {});
          const id = new Contract({}).impureCircuits.participantId(ctx, new Uint8Array(opening.secret)).result;
          if (!publicState.submissions.member(id)) console.log('This saved opening has no indexed commitment yet.');
          else {
            const entry = publicState.submissions.lookup(id);
            console.log('Own record revealed:', entry.revealed, '| Public rating:', entry.value.toString());
          }
        } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') console.log('No opening saved for this participant; read did not create one.'); else throw error; }
      } else {
        // Wait for fees before finding the deployed contract and submitting a call.
        await waitForDust(wallet);
        const deployed = await findDeployedContract(providers, { compiledContract: compiled, contractAddress: address, privateStateId: 'course', initialPrivateState: {} });
        if (action === 'commit') {
          const secret = Array.from(randomBytes(32));
          const salt = Array.from(randomBytes(32));
          // Persist the opening before any submission, and never replace it on retry.
          await writeFile(openingFile, JSON.stringify({ network: networkId, address, secret, salt, choice: rating, wallet: bridge.getCoinPublicKey() }), { flag: 'wx', mode: 0o600 });
          const result = await deployed.callTx.commitFor(new Uint8Array(secret), BigInt(rating!), new Uint8Array(salt));
          console.log('Commit confirmed:', result.public.txId, result.public.blockHeight);
        } else {
          // Restore the original opening and require it to belong to this exact session.
          const opening = JSON.parse(await readFile(openingFile, 'utf8'));
          const bytes = (value: unknown): value is number[] => Array.isArray(value) && value.length === 32 && value.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
          if (opening.network !== networkId || opening.address !== address || opening.wallet !== bridge.getCoinPublicKey() || !bytes(opening.secret) || !bytes(opening.salt) || !/^[1-5]$/.test(opening.choice)) throw new Error('Invalid or mismatched saved opening');
          const secret = new Uint8Array(opening.secret);
          const ctx = runtime.createCircuitContext(address, bridge.getCoinPublicKey(), state, {});
          const id = new Contract({}).impureCircuits.participantId(ctx, secret).result;
          const result = await deployed.callTx.revealFor(id, secret, BigInt(opening.choice), new Uint8Array(opening.salt));
          console.log('Reveal confirmed:', result.public.txId, result.public.blockHeight);
        }
        // Read-back is a separate observation from the transaction request itself.
        console.log('Run read to inspect the indexed record; preserve the opening for recovery.');
      }
    }
  }
} finally {
  // Close subscriptions after success or failure without undoing submitted operations.
  await wallet.stop();
}
