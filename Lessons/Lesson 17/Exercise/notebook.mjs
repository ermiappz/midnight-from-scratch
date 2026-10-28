// Persist data through the filesystem so another process can restore it.
import { writeFile, readFile } from 'node:fs/promises';
// Use assertions or explicit errors to reject malformed or mismatched data.
import assert from 'node:assert/strict';
// TODO 17A: Validate, serialize and exclusively create a private opening file.
export async function saveOpening(file, scope, opening) {
  throw new Error('TODO 17A: save the versioned opening');
}
// TODO 17B–C: Restore typed values only after checking version, scope and byte ranges.
export async function loadOpening(file, scope) {
  throw new Error('TODO 17B: restore the original opening');
}
