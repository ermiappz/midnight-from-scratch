// Use real assertions so the checker can detect acceptance of a broken contract fixture.
import assert from 'node:assert/strict';
// Exercise the full valid flow against a fresh fixture supplied by the checkpoint.
export function testHappyPath(makeRound) {
  const { call, state, admin, alice, bob } = makeRound();
  // Submit independent openings before the organizer starts reveal.
  for (const person of [alice, bob]) call('submit', person.secret, person.choice, person.salt);
  call('startReveal', admin);
  // Reveal both original openings before closing the round.
  for (const person of [alice, bob]) call('reveal', person.id, person.secret, person.choice, person.salt);
  call('close', admin);
  // Inspect state rather than trusting a printed success message.
  assert.equal(state().phase, 2n);
  assert.equal(state().total, 8n);
  assert.equal(state().revealedCount, 2n);
}
// Check changed ratings and changed salts separately, including retained public state.
export function testWrongOpenings(makeRound) {
  const { call, state, admin, alice } = makeRound();
  call('submit', alice.secret, alice.choice, alice.salt);
  call('startReveal', admin);
  // Keep the original salt intact for the final valid opening.
  const wrongSalt = new Uint8Array(alice.salt);
  wrongSalt[0] ^= 1;
  assert.throws(() => call('reveal', alice.id, alice.secret, 5n, alice.salt));
  assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, wrongSalt));
  // Neither invalid attempt is allowed to publish a rating or increase totals.
  assert.equal(state().entries.lookup(alice.id).revealed, false);
  assert.equal(state().total, 0n);
  call('reveal', alice.id, alice.secret, alice.choice, alice.salt);
  assert.equal(state().total, 3n);
}
// Inspect state after rejection as well as checking that an exception occurred.
export function testReplayAndState(makeRound) {
  const { call, state, admin, alice } = makeRound();
  call('submit', alice.secret, alice.choice, alice.salt);
  // A reveal during submission is rejected before changing the record.
  assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, alice.salt));
  assert.equal(state().total, 0n);
  call('startReveal', admin);
  assert.throws(() => call('reveal', alice.id, alice.secret, 5n, alice.salt));
  assert.equal(state().total, 0n);
  call('reveal', alice.id, alice.secret, alice.choice, alice.salt);
  assert.throws(() => call('reveal', alice.id, alice.secret, alice.choice, alice.salt));
  // Replay cannot count the same vote twice.
  assert.equal(state().total, 3n);
  assert.equal(state().revealedCount, 1n);
}
