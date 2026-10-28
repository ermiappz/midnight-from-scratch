// Render only the safe view model; private secrets never belong in DOM text or attributes.
export function render(root, model) {
  root.querySelector('#commit').disabled = !model.canCommit;
  root.querySelector('#reveal').disabled = !model.canReveal;
  root.querySelector('#status').textContent = model.status;
  root.querySelector('#error').textContent = model.error;
}
