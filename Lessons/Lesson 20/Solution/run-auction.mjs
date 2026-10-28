// Generate independent private bidder and organizer secrets.
import { randomBytes } from 'node:crypto';
// Fail the demonstration when its observed result differs from the specification.
import assert from 'node:assert/strict';
// Use the pinned runtime for local contract execution.
import * as runtime from '@midnight-ntwrk/compact-runtime';
// Import only this reference's generated auction.
import { Contract, ledger } from './managed/auction/contract/index.js';
// Create fresh randomness for each separate secret or salt.
const bytes = () => new Uint8Array(randomBytes(32));
// Keep authority local while passing only its public hash to the constructor.
const admin = bytes();
const organizer = runtime.persistentHash(new runtime.CompactTypeBytes(32), admin);
// Initialize a contract that does not request witness callbacks.
const contract = new Contract({});
const initial = contract.initialState(runtime.createConstructorContext({}, '0'.repeat(64)), organizer);
// Carry the updated context through the whole auction.
let context = runtime.createCircuitContext(runtime.sampleContractAddress(), '0'.repeat(64), initial.currentContractState, {});
// Keep each successful call's state before attempting the next operation.
function call(name, ...args) {
  const result = contract.circuits[name](context, ...args);
  context = result.context;
  return result.result;
}
// Decode the current public state for assertions and the checkpoint probe.
const state = () => ledger(context.currentQueryContext.state);
// Retain each bidder's original opening until reveal.
const bidders = [{ secret: bytes(), salt: bytes(), bid: 70n }, { secret: bytes(), salt: bytes(), bid: 90n }];
// Commit both bids before anyone can reveal.
for (const bidder of bidders) call('commitBid', bidder.secret, bidder.bid, bidder.salt);
// Ask the authorized organizer to move the auction into reveal phase.
call('startReveal', admin);
// Open each record with its unchanged bid and salt.
for (const bidder of bidders) call('revealBid', bidder.secret, bidder.bid, bidder.salt);
// Freeze the result before reading the final outcome.
call('close', admin);
assert.equal(state().highest, 90n);
assert.equal(state().revealedCount, 2n);
// Print public results only; never print the private opening objects.
console.log('Highest revealed bid:', state().highest.toString());
console.log('Revealed bids:', state().revealedCount.toString());
