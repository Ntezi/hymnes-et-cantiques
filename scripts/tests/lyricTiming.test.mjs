// Run: node scripts/tests/lyricTiming.test.mjs  (Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import {
	LINE_DONE,
	WHOLE_WORD_END,
	buildHymnTiming,
	buildLineKey,
	createHymnTimingLoader,
	findActiveEventIndex,
	getLineProgress,
} from '../../src/lyricTiming.ts';

const UP = { word: -1, charStart: 0, charEnd: 0 };

// --- Version 1 (word events [v,l,w,startMs,endMs]) read as whole-word ranges.
// Two lines; line 0 is sung twice (repeat), with a rest between the phrases.
const v1 = [
	[0, 0, 0, 1000, 1500],
	[0, 0, 1, 1500, 2000],
	[0, 1, 0, 3000, 3500], // 1000 ms rest before this one
	[0, 1, 1, 3500, 4000],
	[0, 0, 0, 5000, 5500], // line 0 again
	[0, 0, 1, 5500, 6000],
];
const timing = buildHymnTiming({ quality: 0.8, events: v1 }, 1);
const events = timing.events;

assert.equal(buildLineKey(2, 3), '2-3');
assert.deepEqual(events[0], [0, 0, 0, 0, WHOLE_WORD_END, 1000, 1500]);
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
const linear = (pos) => events.reduce((acc, e, i) => (e[5] <= pos ? i : acc), -1);
for (const pos of [5200, 100, 4999, 3000, 0, 6500, 1500, 2999]) {
	assert.equal(findActiveEventIndex(events, pos), linear(pos));
}

// Per-line state (whole-word ranges).
assert.deepEqual(getLineProgress(timing, '0-0', -1), UP);
assert.deepEqual(getLineProgress(timing, '0-0', 0), { word: 0, charStart: 0, charEnd: WHOLE_WORD_END }, 'first word current');
assert.equal(getLineProgress(timing, '0-0', 1).word, 1, 'words before it are sung');
assert.deepEqual(getLineProgress(timing, '0-1', 1), UP, 'later line not sung yet');
assert.equal(getLineProgress(timing, '0-0', 2).word, LINE_DONE, 'finished line stays coloured');
assert.equal(getLineProgress(timing, '0-1', 2).word, 0);
assert.equal(getLineProgress(timing, '0-1', 3).word, 1);
assert.equal(getLineProgress(timing, '0-0', 3).word, LINE_DONE);
assert.equal(getLineProgress(timing, '0-0', 4).word, 0, 'repeat resets the line');
assert.equal(getLineProgress(timing, '0-1', 4).word, LINE_DONE);
assert.deepEqual(getLineProgress(timing, '9-9', 3), UP, 'untimed line');

// Seeking back un-sings lines that come later.
assert.deepEqual(getLineProgress(timing, '0-1', findActiveEventIndex(events, 1200)), UP);

// --- Version 2 (syllable events [v,l,w,charStart,charEnd,startMs,endMs]).
// Line 0 = "Turagusingiza Data": Tu-ra-gu-sin-gi-za (13 chars) then Da-ta, sung twice.
const v2 = [
	[0, 0, 0, 0, 2, 0, 400],
	[0, 0, 0, 2, 4, 400, 800],
	[0, 0, 0, 4, 6, 800, 1200],
	[0, 0, 0, 6, 9, 1200, 1600],
	[0, 0, 0, 9, 11, 1600, 2000],
	[0, 0, 0, 11, 13, 2000, 2400],
	[0, 0, 1, 0, 2, 2400, 2800],
	[0, 0, 1, 2, 4, 2800, 3200],
	[0, 0, 0, 0, 2, 4000, 4400], // repeat of the line
];
const t2 = buildHymnTiming({ events: v2 }, 2);
assert.deepEqual(t2.events[3], v2[3], 'v2 events are used as they are');

const at = (ms) => findActiveEventIndex(t2.events, ms);
// Partway through "Turagusingiza": "Tura" sung, "gu" current, "singiza" not yet sung.
assert.deepEqual(getLineProgress(t2, '0-0', at(900)), { word: 0, charStart: 4, charEnd: 6 });
assert.deepEqual(getLineProgress(t2, '0-0', at(0)), { word: 0, charStart: 0, charEnd: 2 }, 'first syllable, nothing sung before');
assert.deepEqual(getLineProgress(t2, '0-0', at(2900)), { word: 1, charStart: 2, charEnd: 4 }, 'second word, first word sung');
assert.equal(getLineProgress(t2, '0-0', at(3500)).word, 1, 'rest keeps the last syllable current');
assert.deepEqual(getLineProgress(t2, '0-0', at(4100)), { word: 0, charStart: 0, charEnd: 2 }, 'repeat resets the line');
// Syllable ranges of a word are contiguous and start where the previous one ended.
const word0 = v2.slice(0, 6);
word0.forEach((e, i) => i > 0 && assert.equal(e[3], word0[i - 1][4]));

// A line from a v2 file that is not the active one: sung earlier = done, later = upcoming.
const t2b = buildHymnTiming({ events: [...v2, [0, 1, 0, 0, 5, 6000, 7000]] }, 2);
assert.equal(getLineProgress(t2b, '0-0', 9).word, LINE_DONE);
assert.deepEqual(getLineProgress(t2b, '0-1', 4), UP);

// One timing file per edition, all version 2 (empty ones are placeholders until data exists).
import fs from 'node:fs';
for (const name of ['lyricTiming.json', 'lyricTiming_fr.json', 'lyricTiming_en.json', 'lyricTiming_ee.json']) {
	const file = JSON.parse(fs.readFileSync(new URL(`../../src/${name}`, import.meta.url), 'utf8'));
	assert.equal(file.version, 2, name);
	assert.equal(typeof file.hymns, 'object', name);
}

// --- The loader reads an edition once and indexes only the hymn that is asked for.
{
	let reads = 0;
	const touched = [];
	const hymn = (n) => ({
		get events() { touched.push(n); return [[0, 0, 0, 0, 5, 1000, 2000]]; },
	});
	const load = createHymnTimingLoader({
		'hymnes-xx': () => { reads += 1; return { version: 2, hymns: { 1: hymn(1), 2: hymn(2), 3: { events: [] } } }; },
	});
	assert.equal(reads, 0, 'nothing is read before the first request');
	const first = load('2', 'hymnes-xx');
	assert.ok(first && first.events.length === 1);
	assert.equal(reads, 1);
	assert.ok(!touched.includes(1), 'other hymns are not indexed');
	assert.equal(load(2, 'hymnes-xx'), first, 'result is memoised');
	assert.equal(load('3', 'hymnes-xx'), null, 'empty hymn has no timing');
	assert.equal(load('9', 'hymnes-xx'), null, 'unknown hymn has no timing');
	assert.equal(load('1', 'unknown'), null, 'unknown edition has no timing');
	assert.equal(reads, 1, 'edition read once');
}

console.log('lyricTiming tests passed');
