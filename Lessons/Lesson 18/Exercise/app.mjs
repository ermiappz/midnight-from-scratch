// Keep asynchronous workflow rules separate from the DOM adapter.
import { viewModel, submitAction } from './workflow.mjs';
// Update the same visible controls after every state change.
import { render } from './view.mjs';
// This deliberately labeled local simulation does not connect to a wallet or blockchain.
const state = { connected: true, pending: false, phase: 'submit', committed: false, revealed: false, hasOpening: true, error: '' };
// Keep the simulated confirmed record separate from the UI's optimistic state.
const chain = { committed: false, revealed: false, phase: 'submit' };
// Delay the adapter to make the pending transition visible to the learner.
const pause = () => new Promise(resolve => setTimeout(resolve, 500));
// Replace this adapter with the confirmed provider calls from lesson 14 for a real integration.
const client = {
  async commit() { await pause(); chain.committed = true; chain.phase = 'reveal'; },
  async reveal() { await pause(); chain.revealed = true; chain.phase = 'closed'; },
  async readState() { return { ...chain }; },
};
// Avoid passing the private application record into the rendering layer.
const refresh = model => render(document, model);
// Bind each button to the same tested workflow instead of duplicating asynchronous logic.
for (const action of ['commit', 'reveal']) {
  document.querySelector(`#${action}`).addEventListener('click', () => {
    // Handle an unavailable action without an unhandled promise rejection.
    void submitAction(state, action, client, refresh).catch(() => refresh(viewModel(state)));
  });
}
// Display the initial state before the first interaction.
refresh(viewModel(state));
