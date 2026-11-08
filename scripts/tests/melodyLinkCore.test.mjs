// Run: node scripts/tests/melodyLinkCore.test.mjs  (Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import {
	applyLinkSelection,
	buildDefaultNumberMap,
	emptyOverrides,
	hasOverrides,
	legacyLinksToSongIdOverrides,
	normalizeOverrides,
	parseSongNumber,
	resolveEffectiveMap,
} from '../../src/melodyLinkCore.ts';

const defaults = buildDefaultNumberMap([[7, 8], [9, 48], [20, 126, 139]]);
const sorted = (v = []) => [...v].sort((a, b) => a - b);

assert.equal(parseSongNumber('hymnes-rw:5'), 5);
assert.equal(parseSongNumber('12'), 12);
assert.equal(parseSongNumber('hymnes-fr:x'), null);
assert.deepEqual(sorted(defaults[20]), [126, 139]);

// 1. No overrides = defaults
assert.deepEqual(resolveEffectiveMap(defaults, emptyOverrides()), defaults);

// 2. Current shape: user adds 7-9 and removes default 9-48, symmetric
let ov = applyLinkSelection(defaults, emptyOverrides(), 7, [8, 9]);
let eff = resolveEffectiveMap(defaults, ov);
assert.deepEqual(sorted(eff[7]), [8, 9]);
assert.deepEqual(sorted(eff[9]), [7, 48]);
ov = applyLinkSelection(defaults, ov, 9, [7]);
eff = resolveEffectiveMap(defaults, ov);
assert.equal(eff[48], undefined);
assert.deepEqual(sorted(eff[9]), [7]);
assert.ok(hasOverrides(ov));

// 3. Reset = empty overrides, defaults back
assert.ok(!hasOverrides(emptyOverrides()));
assert.deepEqual(resolveEffectiveMap(defaults, emptyOverrides())[9], [48]);

// 4. Migration of song_id-keyed overrides: edits in rw and fr merge by number, nothing lost
const songIdShape = {
	added: { 'hymnes-rw:7': ['hymnes-rw:9'], 'hymnes-rw:9': ['hymnes-rw:7'], 'hymnes-fr:30': ['hymnes-fr:31'] },
	removed: { 'hymnes-en:9': ['hymnes-en:48'], 'hymnes-en:48': ['hymnes-en:9'] },
};
const migrated = normalizeOverrides(songIdShape);
assert.deepEqual(migrated.added, { 7: [9], 9: [7], 30: [31] });
assert.deepEqual(migrated.removed, { 9: [48], 48: [9] });
eff = resolveEffectiveMap(defaults, migrated);
assert.deepEqual(sorted(eff[7]), [8, 9]);
assert.equal(eff[48], undefined);
assert.deepEqual(eff[30], [31]);
// migrating the already-migrated shape is a no-op
assert.deepEqual(normalizeOverrides(migrated), migrated);
// junk is ignored, not thrown
assert.deepEqual(normalizeOverrides(null), emptyOverrides());
assert.deepEqual(normalizeOverrides({ added: { a: ['b'], 5: 'x' } }), emptyOverrides());

// 5. Oldest storage ('melody_links', seeded): only user edits survive
const legacyDefaults = { 'hymnes-rw:9': ['hymnes-rw:48'], 'hymnes-rw:48': ['hymnes-rw:9'] };
const legacyUser = {
	'hymnes-rw:9': ['hymnes-rw:48', 'hymnes-rw:10'],   // kept default + added 10
	'hymnes-rw:10': ['hymnes-rw:9'],
};
const fromLegacy = normalizeOverrides(legacyLinksToSongIdOverrides(legacyUser, true, legacyDefaults));
assert.deepEqual(fromLegacy.added, { 9: [10], 10: [9] });
assert.deepEqual(fromLegacy.removed, { 48: [9] }); // 48 -> 9 missing from saved map = user removed it
const unseeded = normalizeOverrides(legacyLinksToSongIdOverrides({ 'hymnes-rw:3': ['hymnes-rw:4'] }, false, legacyDefaults));
assert.deepEqual(unseeded.added, { 3: [4] });
assert.deepEqual(unseeded.removed, {});

console.log('melodyLinkCore tests passed');
