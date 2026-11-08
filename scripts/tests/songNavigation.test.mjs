// Run: node scripts/tests/songNavigation.test.mjs
import assert from 'node:assert/strict';
import { getPopCountToSong } from '../../src/songNavigation.ts';

const detail = (id) => ({ name: 'SongDetail', params: { song_id: id } });
const routes = [{ name: 'Home' }, detail('a'), detail('b'), detail('c')];

assert.equal(getPopCountToSong(routes, 3, 'b'), 1, 'previous hymn: pop one');
assert.equal(getPopCountToSong(routes, 3, 'a'), 2, 'older hymn in the stack: pop to it');
assert.equal(getPopCountToSong(routes, 3, 'z'), 0, 'not in stack: push');
assert.equal(getPopCountToSong(routes, 3, 'c'), 0, 'current hymn is not a pop target');
assert.equal(getPopCountToSong(routes, 1, 'c'), 0, 'screens above the current one are ignored');
assert.equal(getPopCountToSong([{ name: 'Home' }, { name: 'Other', params: { song_id: 'a' } }, detail('b')], 2, 'a'), 0, 'only SongDetail routes count');
console.log('songNavigation tests passed');
