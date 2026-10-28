// Evaluate this completed reference without marking learner checkpoints complete.
import { evaluateCheckpoint } from '../../../scripts/check-exercise.mjs';
// Resolve this reference independently of the shell's working directory.
import { fileURLToPath } from 'node:url';
const folder = fileURLToPath(new URL('./', import.meta.url));
// Check every stage's behavior against the actual reference files.
for (const id of ["16A", "16B", "16C"]) {
  await evaluateCheckpoint(id, folder);
  console.log(`Reference ${id} passed`);
}
