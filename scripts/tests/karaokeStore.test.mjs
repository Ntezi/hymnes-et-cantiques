// Run: node scripts/tests/karaokeStore.test.mjs
import assert from 'node:assert/strict';
import { createKaraokeStore } from '../../src/karaokeStore.ts';

const store = createKaraokeStore();
assert.equal(store.get(), -1);
let calls = 0;
const off = store.subscribe(() => { calls += 1; });
store.set(3);
store.set(3);
assert.equal(calls, 1, 'same index does not notify');
assert.equal(store.get(), 3);
store.set(-1);
assert.equal(calls, 2);
off();
store.set(5);
assert.equal(calls, 2, 'unsubscribed listener is not called');
console.log('karaokeStore tests passed');
