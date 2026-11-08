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

interface SongIndex {
	title: string;
	subtitle: string;
	lines: { original: string; normalized: string }[];
	lyrics: string;
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
	};
	indexCache.set(song, built);
	return built;
};

const includesAll = (haystack: string, tokens: string[]) =>
	tokens.every(token => haystack.includes(token));

const truncateSnippet = (text: string) =>
	text.length <= SNIPPET_MAX ? text : `${text.slice(0, SNIPPET_MAX - 1).trimEnd()}…`;

export const buildSnippet = (song: SearchableSong, normalizedQuery: string): string | undefined => {
	const { lines } = getIndex(song);
	const tokens = normalizedQuery.split(' ').filter(Boolean);
	const hit =
		lines.find(line => line.normalized.includes(normalizedQuery))
		|| lines.find(line => includesAll(line.normalized, tokens))
		|| lines.find(line => line.normalized.includes(tokens[0]));
	return hit ? truncateSnippet(hit.original) : undefined;
};

// Digits only: exact number first, then numbers starting with the digits (ascending),
// and nothing else (titles and lyrics are not searched for digit-only queries).
// Text: title (starts-with before contains), then subtitle, then lyrics with a snippet.
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

	return results;
};
