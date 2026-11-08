// Run: node scripts/tests/searchUtils.test.mjs  (Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import { foldText, normalizeText, searchSongs } from '../../src/searchUtils.ts';

const mk = (n, title, verses, sub_title) => ({ song_number: n, title, verses, sub_title });
const songs = [
	mk(1, 'Nous t’adorons', ['Nous t’adorons, notre Père,\nÔ toi qui vis dans la lumière']),
	mk(2, 'Cantiqué de joie', ['Gloire au Dieu Sauveur']),
	...[10, 11, 100, 101, 110, 20, 21].map(n => mk(n, `Hymne ${n}`, ['x'])),
];

assert.equal(normalizeText('  Été d’un  cœur '), 'ete dun coeur');
assert.equal(normalizeText("d'un"), normalizeText('d’un'));

// accent / case / apostrophe folding
assert.equal(searchSongs(songs, 'CANTIQUE')[0].song.song_number, 2);
assert.equal(searchSongs(songs, "nous t'adorons")[0].song.song_number, 1);
assert.equal(searchSongs(songs, 'lumiere')[0].matchType, 'lyrics');
assert.equal(searchSongs(songs, 'lumiÈre')[0].snippet, 'Ô toi qui vis dans la lumière');

// number: exact first, then prefix ascending
assert.deepEqual(searchSongs(songs, '1').map(r => r.song.song_number), [1, 10, 11, 100, 101, 110]);
assert.deepEqual(searchSongs(songs, '10').map(r => r.song.song_number), [10, 100, 101]);
assert.deepEqual(searchSongs(songs, '21').map(r => r.song.song_number), [21]);
assert.equal(searchSongs(songs, '999').length, 0);
assert.equal(searchSongs(songs, '   ').length, 0);

// Ewe: ɖ ɛ ƒ ɣ ŋ ɔ ʋ stay distinct letters; tone accents are stripped
assert.equal(normalizeText('Ɖeviwo ƒe ŋutifafa'), 'ɖeviwo ƒe ŋutifafa');
assert.equal(normalizeText('ƆƐƑƔŊƲ'), 'ɔɛƒɣŋʋ');
assert.equal(normalizeText('Míele subɔwòm, ɛ́ ɔ̃ ʋ́'), 'miele subɔwom, ɛ ɔ ʋ');
assert.equal(foldText('ɖɛƒɣŋɔʋ'), 'defgnov');
const ewe = [
	mk(1, 'Míele subɔwòm', ['Míele subɔwòm, mía Fofo Oo,\nWò si le kekeme me']),
	mk(2, 'Subo le dzi me', ['Subo le dzi me\nƉeviwo ƒe ŋutifafa']),
	mk(3, 'Aleluya', ['Ma kafu wò, ɖe dzidzɔ me']),
];
// tone accents ignored, exact letter matches
assert.deepEqual(searchSongs(ewe, 'mielè').map(r => r.song.song_number), [1]);
// typing the Ewe letter: exact match first, plain-o 'Subo' only as fuzzy match after it
assert.deepEqual(searchSongs(ewe, 'subɔ').map(r => r.song.song_number), [1, 2]);
assert.deepEqual(searchSongs(ewe, 'ŋutifafa').map(r => r.song.song_number), [2]);
// 'n' does not exact-match 'ŋ'; the fuzzy pass finds it
assert.deepEqual(searchSongs(ewe, 'nutifafa').map(r => r.song.song_number), [2]);
// fuzzy fallback ranks below exact: plain 'subo' finds the exact title (2) before 'subɔ' (1)
assert.deepEqual(searchSongs(ewe, 'subo').map(r => [r.song.song_number, r.matchType]), [[2, 'title'], [1, 'title']]);
assert.deepEqual(searchSongs(ewe, 'dzidzo').map(r => r.song.song_number), [3]);
assert.equal(searchSongs(ewe, 'dzidzo')[0].snippet, 'Ma kafu wò, ɖe dzidzɔ me');
// folding is one-directional per letter: 'ɖ' query does not match plain 'd'
assert.deepEqual(searchSongs(ewe, 'ɖeviwo').map(r => r.song.song_number), [2]);
assert.deepEqual(searchSongs([mk(9, 'x', ['deviwo'])], 'ɖeviwo').length, 1);

console.log('searchUtils tests passed');
