// Fail visibly if the reference manifest does not match the lesson's claims.
import assert from 'node:assert/strict';
// Read the manifest as data rather than treating it as executable code.
import { readFileSync } from 'node:fs';
// Resolve the file beside this test so the caller's directory does not matter.
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
// The name labels the npm project; it does not start an application.
assert.equal(manifest.name, 'midnight-from-scratch');
// This flag blocks accidental npm publication, not access to blockchain state.
assert.equal(manifest.private, true);
// Lesson 1 intentionally has no scripts or dependencies yet.
assert.deepEqual(Object.keys(manifest).sort(), ['name', 'private']);
// Report the two properties verified without introducing a compiler prematurely.
console.log('Lesson 1: two-field manifest checked; no contract exists yet');
