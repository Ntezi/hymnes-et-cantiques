// Pure helpers for hymn search. No React or JSON imports so they can be run from node tests.

export interface SearchableSong {
	song_number: number;
	title: string;
	sub_title?: string;
	verses: string[];
}

export type SearchMatchType = 'number' | 'title' | 'subtitle' | 'lyrics';

export interface SearchResult<T extends SearchableSong> {
	song: T;
	matchType: SearchMatchType;
	snippet?: string;
}

const APOSTROPHES = /['‘’‛ʼ`´]/g;
const SNIPPET_MAX = 80;

// Lowercase, strip diacritics, drop apostrophe variants, collapse whitespace.
export const normalizeText = (value: string): string =>
	(value || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/œ/g, 'oe')
		.replace(/æ/g, 'ae')
		.replace(APOSTROPHES, '')
		.replace(/\s+/g, ' ')
		.trim();

// Ewe letters (ɖ ɛ ƒ ɣ ŋ ɔ ʋ) are distinct letters, not accented ones: normalizeText leaves them intact
// (they have no Unicode decomposition), so 'subo' does not match 'subɔ' in the exact passes.
// foldText maps them to their nearest Latin letter; it is used only for a secondary, lower-ranked pass
// so people on a plain keyboard can still find Ewe hymns.
const EWE_FOLD: Record<string, string> = { 'ɖ': 'd', 'ɛ': 'e', 'ƒ': 'f', 'ɣ': 'g', 'ŋ': 'n', 'ɔ': 'o', 'ʋ': 'v' };
const EWE_LETTERS = /[ɖɛƒɣŋɔʋ]/g;

export const foldText = (normalized: string): string =>
	normalized.replace(EWE_LETTERS, letter => EWE_FOLD[letter]);

interface SongIndex {
	title: string;
	subtitle: string;
	lines: { original: string; normalized: string }[];
	lyrics: string;
	folded: { title: string; subtitle: string; lyrics: string; lines: string[] };
}

const indexCache = new WeakMap<object, SongIndex>();

const getIndex = (song: SearchableSong): SongIndex => {
	const cached = indexCache.get(song);
	if (cached) {
		return cached;
	}
	const lines: { original: string; normalized: string }[] = [];
	for (const verse of song.verses || []) {
		for (const line of String(verse).split('\n')) {
			const original = line.trim();
			const normalized = normalizeText(original);
			if (normalized) {
				lines.push({ original, normalized });
			}
		}
	}
	const built: SongIndex = {
		title: normalizeText(song.title),
		subtitle: normalizeText(song.sub_title || ''),
		lines,
		lyrics: lines.map(line => line.normalized).join(' '),
		folded: { title: '', subtitle: '', lyrics: '', lines: [] },
	};
	built.folded = {
		title: foldText(built.title),
		subtitle: foldText(built.subtitle),
		lyrics: foldText(built.lyrics),
		lines: lines.map(line => foldText(line.normalized)),
	};
	indexCache.set(song, built);
	return built;
};

const includesAll = (haystack: string, tokens: string[]) =>
	tokens.every(token => haystack.includes(token));

const truncateSnippet = (text: string) =>
	text.length <= SNIPPET_MAX ? text : `${text.slice(0, SNIPPET_MAX - 1).trimEnd()}…`;

export const buildSnippet = (song: SearchableSong, normalizedQuery: string, folded = false): string | undefined => {
	const index = getIndex(song);
	const tokens = normalizedQuery.split(' ').filter(Boolean);
	const texts = folded ? index.folded.lines : index.lines.map(line => line.normalized);
	let at = texts.findIndex(text => text.includes(normalizedQuery));
	if (at < 0) {
		at = texts.findIndex(text => includesAll(text, tokens));
	}
	if (at < 0) {
		at = texts.findIndex(text => text.includes(tokens[0]));
	}
	return at >= 0 ? truncateSnippet(index.lines[at].original) : undefined;
};

// Digits only: exact number first, then numbers starting with the digits (ascending),
// and nothing else (titles and lyrics are not searched for digit-only queries).
// Text: title (starts-with before contains), then subtitle, then lyrics with a snippet.
// Then the same three passes again on Ewe-folded text (ɔ→o, ɛ→e, ɖ→d, ŋ→n, ƒ→f, ɣ→g, ʋ→v), so fuzzy
// matches always rank after every exact match.
export const searchSongs = <T extends SearchableSong>(songs: T[], query: string): SearchResult<T>[] => {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery) {
		return [];
	}

	const tokens = normalizedQuery.split(' ');
	const results: SearchResult<T>[] = [];
	const used = new Set<T>();
	const push = (song: T, matchType: SearchMatchType, snippet?: string) => {
		if (!used.has(song)) {
			used.add(song);
			results.push({ song, matchType, snippet });
		}
	};

	if (/^\d+$/.test(normalizedQuery)) {
		const wanted = String(Number(normalizedQuery));
		const byNumber = songs
			.filter(song => String(song.song_number).startsWith(wanted))
			.sort((a, b) => a.song_number - b.song_number);
		byNumber
			.filter(song => String(song.song_number) === wanted)
			.forEach(song => push(song, 'number'));
		byNumber.forEach(song => push(song, 'number'));
		return results;
	}

	const indexes = songs.map(song => ({ song, index: getIndex(song) }));
	indexes
		.filter(({ index }) => includesAll(index.title, tokens))
		.sort((a, b) => Number(b.index.title.startsWith(normalizedQuery)) - Number(a.index.title.startsWith(normalizedQuery)))
		.forEach(({ song }) => push(song, 'title'));
	indexes
		.filter(({ index }) => index.subtitle && includesAll(index.subtitle, tokens))
		.forEach(({ song }) => push(song, 'subtitle'));

	indexes
		.filter(({ index }) => includesAll(index.lyrics, tokens))
		.forEach(({ song }) => push(song, 'lyrics', buildSnippet(song, normalizedQuery)));

	const foldedQuery = foldText(normalizedQuery);
	const foldedTokens = foldedQuery.split(' ');
	indexes
		.filter(({ index }) => includesAll(index.folded.title, foldedTokens))
		.sort((a, b) => Number(b.index.folded.title.startsWith(foldedQuery)) - Number(a.index.folded.title.startsWith(foldedQuery)))
		.forEach(({ song }) => push(song, 'title'));
	indexes
		.filter(({ index }) => index.folded.subtitle && includesAll(index.folded.subtitle, foldedTokens))
		.forEach(({ song }) => push(song, 'subtitle'));
	indexes
		.filter(({ index }) => includesAll(index.folded.lyrics, foldedTokens))
		.forEach(({ song }) => push(song, 'lyrics', buildSnippet(song, foldedQuery, true)));

	return results;
};
