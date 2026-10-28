// Reuse the local wallet setup and DUST readiness check.
import { openLocalWallet, waitForDust } from './wallet.js';
// Open the local wallet and retain the capabilities this script uses.
const { wallet, keystore } = await openLocalWallet();
// Keep cleanup or expected-error handling active if the operation throws.
try {
  // Display the observed value at this stage of the example.
  console.log('Local unshielded address:', keystore.getBech32Address().toString());
  // Retain the result needed for the following checks.
  const state = await waitForDust(wallet);
  // Display the observed value at this stage of the example.
  console.log('Synchronized:', state.isSynced);
  // Display the observed value at this stage of the example.
  console.log('DUST (SPECK):', state.dust.balance(new Date()).toString());
} finally {
  // Close wallet connections and subscriptions even when the operation fails.
  await wallet.stop();
}
