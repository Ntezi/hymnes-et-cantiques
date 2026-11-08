// Run: node scripts/tests/textNotes.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../../src/${name}`, import.meta.url), 'utf8'));
const notes = read('textNotes.json');
const KINDS = ['missingVerse', 'versesMixed', 'checkText'];
const FILES = { 'hymnes-ee': 'songs_ee.json', 'hymnes-rw': 'songs.json', 'hymnes-fr': 'songs_fr.json', 'hymnes-en': 'songs_en.json' };
const i18nSource = fs.readFileSync(new URL('../../src/i18n.ts', import.meta.url), 'utf8');

for (const [collectionId, byNumber] of Object.entries(notes)) {
	assert.ok(FILES[collectionId], `unknown collection ${collectionId}`);
	const numbers = new Set(read(FILES[collectionId]).map(song => String(song.song_number)));
	for (const [number, kind] of Object.entries(byNumber)) {
		assert.ok(numbers.has(number), `${collectionId} has no hymn ${number}`);
		assert.ok(KINDS.includes(kind), `${collectionId}:${number} has unknown kind ${kind}`);
	}
}
// every kind is translated in each of the four UI languages
for (const kind of KINDS) {
	assert.equal(i18nSource.split(`${kind}: `).length - 1, 4, `${kind} must exist in en, fr, rw and ee`);
}
console.log('textNotes tests passed');
