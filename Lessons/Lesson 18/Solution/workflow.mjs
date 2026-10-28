// Derive UI permissions from current state while leaving real authorization to the contract.
export function viewModel(state) {
  const ready = state.connected && !state.pending;
  return {
    canCommit: ready && state.phase === 'submit' && !state.committed,
    canReveal: ready && state.phase === 'reveal' && state.committed && state.hasOpening && !state.revealed,
    status: state.pending ? 'Pending confirmation' : state.revealed ? 'Revealed' : state.committed ? 'Committed' : 'Not submitted',
    error: state.error ?? '',
  };
}
// Keep pending work visible, reject duplicate clicks, and read confirmed state after the call.
export async function submitAction(state, action, client, notify) {
  const allowed = viewModel(state);
  if (!(action === 'commit' ? allowed.canCommit : action === 'reveal' && allowed.canReveal)) throw new Error('Action unavailable');
  state.pending = true;
  state.error = '';
  notify(viewModel(state));
  try {
    // The adapter resolves this promise only when the operation has confirmed.
    await client[action]();
    const confirmed = await client.readState();
    // Copy only public workflow fields; never publish openings from an adapter result.
    state.committed = confirmed.committed;
    state.revealed = confirmed.revealed;
    state.phase = confirmed.phase;
  } catch {
    // Use a controlled message instead of displaying arbitrary errors containing private data.
    state.error = 'Operation failed. Check confirmed state before retrying.';
  } finally {
    state.pending = false;
    notify(viewModel(state));
  }
}
