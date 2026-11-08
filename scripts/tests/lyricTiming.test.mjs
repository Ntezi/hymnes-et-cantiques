// Run: node scripts/tests/lyricTiming.test.mjs  (Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import {
	LINE_DONE,
	LINE_UPCOMING,
	buildHymnTiming,
	buildLineKey,
	findActiveEventIndex,
	getLineProgress,
} from '../../src/lyricTiming.ts';

// Two lines; line 0 is sung twice (repeat), with a rest between the phrases.
const events = [
	[0, 0, 0, 1000, 1500],
	[0, 0, 1, 1500, 2000],
	[0, 1, 0, 3000, 3500], // 1000 ms rest before this one
	[0, 1, 1, 3500, 4000],
	[0, 0, 0, 5000, 5500], // line 0 again
	[0, 0, 1, 5500, 6000],
];
const timing = buildHymnTiming({ quality: 0.8, events });

assert.equal(buildLineKey(2, 3), '2-3');
assert.deepEqual(timing.lineEvents['0-0'], [0, 1, 4, 5]);
assert.deepEqual(timing.lineEvents['0-1'], [2, 3]);
assert.equal(timing.quality, 0.8);

// Binary search: before the first event, exact starts, inside a word, in a rest, past the end.
assert.equal(findActiveEventIndex(events, 0), -1);
assert.equal(findActiveEventIndex(events, 999), -1);
assert.equal(findActiveEventIndex(events, 1000), 0);
assert.equal(findActiveEventIndex(events, 1499), 0);
assert.equal(findActiveEventIndex(events, 1500), 1);
assert.equal(findActiveEventIndex(events, 2500), 1, 'rest keeps the last word current');
assert.equal(findActiveEventIndex(events, 3000), 2);
assert.equal(findActiveEventIndex(events, 99999), 5);
assert.equal(findActiveEventIndex([], 500), -1);

// Seeking in any order gives the same answer as a linear scan.
const linear = (pos) => events.reduce((acc, e, i) => (e[3] <= pos ? i : acc), -1);
for (const pos of [5200, 100, 4999, 3000, 0, 6500, 1500, 2999]) {
	assert.equal(findActiveEventIndex(events, pos), linear(pos));
}

// Per-line state.
assert.equal(getLineProgress(timing, '0-0', -1), LINE_UPCOMING);
assert.equal(getLineProgress(timing, '0-0', 0), 0, 'first word current');
assert.equal(getLineProgress(timing, '0-0', 1), 1, 'words before it are sung');
assert.equal(getLineProgress(timing, '0-1', 1), LINE_UPCOMING, 'later line not sung yet');
assert.equal(getLineProgress(timing, '0-0', 2), LINE_DONE, 'finished line stays coloured');
assert.equal(getLineProgress(timing, '0-1', 2), 0);
assert.equal(getLineProgress(timing, '0-1', 3), 1);
assert.equal(getLineProgress(timing, '0-0', 3), LINE_DONE);
assert.equal(getLineProgress(timing, '0-0', 4), 0, 'repeat resets the line');
assert.equal(getLineProgress(timing, '0-1', 4), LINE_DONE);
assert.equal(getLineProgress(timing, '9-9', 3), LINE_UPCOMING, 'untimed line');

// Seeking back un-sings lines that come later.
assert.equal(getLineProgress(timing, '0-1', findActiveEventIndex(events, 1200)), LINE_UPCOMING);

console.log('lyricTiming tests passed');
