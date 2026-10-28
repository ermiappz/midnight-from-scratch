// TODO 18A: Compute canCommit, canReveal, status and a safe error string.
export function viewModel(state) {
  throw new Error('TODO 18A: derive the visible workflow state');
}
// TODO 18B: Gate actions, set pending, await the client, read back, and notify.
export async function submitAction(state, action, client, notify) {
  throw new Error('TODO 18B: implement asynchronous confirmation');
}
