// Persist the opening using Node's filesystem API rather than process memory.
import { writeFile, readFile } from 'node:fs/promises';
// Validate the small teaching format before creating or trusting a saved record.
import assert from 'node:assert/strict';

// Bind each opening to its application context so account switches cannot silently select it.
function validateScope(scope) {
  for (const key of ['account', 'network', 'contract', 'round']) {
    assert.equal(typeof scope?.[key], 'string', `Missing scope field ${key}`);
    assert.ok(scope[key].length > 0, `Empty scope field ${key}`);
  }
}
// Preserve the actual bytes and reject values that cannot be a valid rating opening.
function validateOpening(opening) {
  for (const key of ['secret', 'salt']) assert.ok(opening?.[key] instanceof Uint8Array && opening[key].length === 32, `${key} must contain 32 bytes`);
  assert.ok(typeof opening.choice === 'bigint' && opening.choice >= 1n && opening.choice <= 5n, 'choice must be a bigint from 1 to 5');
}
// Save before submitting a commitment; exclusive creation prevents accidental replacement.
export async function saveOpening(file, scope, opening) {
  validateScope(scope);
  validateOpening(opening);
  // JSON needs explicit representations for bigint and byte arrays.
  const record = { version: 1, scope, opening: { secret: [...opening.secret], salt: [...opening.salt], choice: opening.choice.toString() } };
  // This file is plaintext with restricted permissions, not encrypted storage.
  await writeFile(file, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
}
// Restore exactly the original opening; a new salt cannot recover an old commitment.
export async function loadOpening(file, scope) {
  validateScope(scope);
  const record = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(record.version, 1, 'Unsupported notebook version');
  for (const key of ['account', 'network', 'contract', 'round']) assert.equal(record.scope?.[key], scope[key], `Opening belongs to another ${key}`);
  // Validate raw JSON before Uint8Array can coerce invalid byte values.
  for (const key of ['secret', 'salt']) assert.ok(Array.isArray(record.opening?.[key]) && record.opening[key].length === 32 && record.opening[key].every(n => Number.isInteger(n) && n >= 0 && n <= 255), `Invalid ${key} bytes`);
  assert.match(record.opening.choice, /^[1-5]$/, 'Invalid stored rating');
  const opening = { secret: new Uint8Array(record.opening.secret), salt: new Uint8Array(record.opening.salt), choice: BigInt(record.opening.choice) };
  validateOpening(opening);
  return opening;
}
