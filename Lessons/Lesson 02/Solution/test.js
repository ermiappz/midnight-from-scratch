// Fail if compilation did not produce the expected artifacts.
import assert from 'node:assert/strict';
// Inspect generated files without executing the contract before lesson 3.
import { existsSync, readFileSync } from 'node:fs';
// Resolve the generated JS relative to this solution's directory.
const modulePath = new URL('./managed/contract/index.js', import.meta.url);
// A successful compiler run should emit executable JavaScript.
assert.ok(existsSync(modulePath), 'Generated JavaScript is missing');
// Inspect the interface that callers will use in the next lesson.
const types = readFileSync(new URL('./managed/contract/index.d.ts', import.meta.url), 'utf8');
// Confirm that the exported circuit appears in the generated interface.
assert.match(types, /storeMessage/);
// Keep the result distinct from executing or deploying a contract.
console.log('Lesson 2: generated JavaScript and storeMessage interface checked');
