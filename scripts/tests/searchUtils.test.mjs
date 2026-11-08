// Run: node scripts/tests/searchUtils.test.mjs  (Node 22.18+ strips TS types natively)
import assert from 'node:assert/strict';
import { normalizeText, searchSongs } from '../../src/searchUtils.ts';

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

console.log('searchUtils tests passed');
