#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FR_URL = 'https://www.cantiquest.org/HeC-Paroles/HeC-001a271_Paroles.htm';
const EN_URL = 'https://www.cantiquest.org/HeC-Paroles/ANO-HeC-Anglais.htm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

const namedEntities = {
	'&nbsp;': ' ',
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'",
	'&euro;': '€',
	'&laquo;': '«',
	'&raquo;': '»',
	'&lsquo;': "'",
	'&rsquo;': "'",
	'&ldquo;': '"',
	'&rdquo;': '"',
	'&ndash;': '-',
	'&mdash;': '-',
	'&hellip;': '…',
	'&copy;': '©',
};

const decodeHtmlEntities = (value) => {
	let decoded = value;
	Object.entries(namedEntities).forEach(([entity, replacement]) => {
		decoded = decoded.split(entity).join(replacement);
	});

	decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
		const parsed = Number.parseInt(code, 10);
		return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
	});

	decoded = decoded.replace(/&#x([\da-fA-F]+);/g, (_, hex) => {
		const parsed = Number.parseInt(hex, 16);
		return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
	});

	return decoded;
};

const stripTags = (value) =>
	value
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '');

const cleanText = (value) => {
	const decoded = decodeHtmlEntities(stripTags(value));
	return decoded
		.replace(/\u00a0/g, ' ')
		.replace(/\r/g, '')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};

const splitLineDashes = (line) =>
	line
		.replace(/\s+-\s+/g, '\n')
		.split('\n')
		.map((part) => part.trim())
		.filter(Boolean);

const getClassNameFromAttrs = (attrs) => {
	const match = attrs.match(/\bclass\s*=\s*['"]?([^\s'">]+)/i);
	return match ? match[1] : '';
};

const normalizeVerse = (lines) =>
	lines
		.map((line) => line.trim())
		.filter(Boolean)
		.join('\n')
		.trim();

const deriveTitleFromVerses = (verses, fallback) => {
	const firstLine = verses
		.flatMap((verse) => verse.split('\n'))
		.map((line) => line.trim())
		.find((line) => line.length > 0 && !/^refrain\b/i.test(line));

	if (!firstLine) {
		return fallback;
	}

	return firstLine
		.replace(/^\d+\.\s*/, '')
		.replace(/[;:,.!?…]+$/g, '')
		.slice(0, 90);
};

const parseFrenchSongs = (html) => {
	const tokenRegex = /<(h2|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
	const songs = [];
	let currentSong = null;
	let currentVerseLines = [];
	let match;

	const flushVerse = () => {
		if (!currentSong || currentVerseLines.length === 0) {
			return;
		}

		const normalized = normalizeVerse(currentVerseLines);
		if (normalized.length > 0) {
			currentSong.verses.push(normalized);
		}
		currentVerseLines = [];
	};

	const flushSong = () => {
		if (!currentSong) {
			return;
		}
		flushVerse();
		if (currentSong.verses.length > 0) {
			currentSong.title = deriveTitleFromVerses(currentSong.verses, `Cantique ${currentSong.song_number}`);
			songs.push(currentSong);
		}
		currentSong = null;
	};

	while ((match = tokenRegex.exec(html)) !== null) {
		const tagName = match[1].toLowerCase();
		const attrs = match[2];
		const text = cleanText(match[3]);

		if (tagName === 'h2') {
			const numberMatch = text.match(/Cantique\s+(\d+)/i);
			if (!numberMatch) {
				continue;
			}

			flushSong();
			currentSong = {
				song_number: Number.parseInt(numberMatch[1], 10),
				title: '',
				sub_title: 'Hymnes et Cantiques - Edition 1991',
				verses: [],
			};
			continue;
		}

		if (!currentSong) {
			continue;
		}

		const className = getClassNameFromAttrs(attrs);
		if (className === 'Clustermoyen') {
			flushVerse();
			continue;
		}

		if (className !== 'posie' || text.length === 0) {
			continue;
		}

		if (/^retour/i.test(text)) {
			continue;
		}

		currentVerseLines.push(text);
	}

	flushSong();
	return songs.sort((a, b) => a.song_number - b.song_number);
};

const parseEnglishSongs = (html) => {
	const tokenRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
	const songs = [];
	let currentSong = null;
	let currentVerseLines = [];
	let match;

	const flushVerse = () => {
		if (!currentSong || currentVerseLines.length === 0) {
			return;
		}
		const normalized = normalizeVerse(currentVerseLines);
		if (normalized.length > 0) {
			currentSong.verses.push(normalized);
		}
		currentVerseLines = [];
	};

	const flushSong = () => {
		if (!currentSong) {
			return;
		}
		flushVerse();
		if (currentSong.verses.length > 0) {
			currentSong.title = deriveTitleFromVerses(currentSong.verses, `Hymn ${currentSong.song_number}`);
			songs.push(currentSong);
		}
		currentSong = null;
	};

	while ((match = tokenRegex.exec(html)) !== null) {
		const attrs = match[1];
		const className = getClassNameFromAttrs(attrs);
		const text = cleanText(match[2]);

		if (className === 'Titrefrancais') {
			const numberMatch = text.match(/^No\s+(\d+)/i);
			if (!numberMatch) {
				continue;
			}
			flushSong();
			currentSong = {
				song_number: Number.parseInt(numberMatch[1], 10),
				title: '',
				sub_title: 'Hymnes et Cantiques - English translation',
				verses: [],
			};
			continue;
		}

		if (!currentSong || className !== 'Usuel' || text.length === 0) {
			continue;
		}

		if (/^(premi[eè]re?\s+edition|first edition|©|isbn|en vente|to buy|let the word of christ|col\.)/i.test(text)) {
			continue;
		}

		if (/^\d+\./.test(text) && currentVerseLines.length > 0) {
			flushVerse();
		}

		splitLineDashes(text).forEach((line) => {
			currentVerseLines.push(line);
		});
	}

	flushSong();
	return songs.sort((a, b) => a.song_number - b.song_number);
};

const buildCrossLanguageMap = (rwSongs, frSongs, enSongs) => {
	const frByNumber = new Map(frSongs.map((song) => [song.song_number, song]));
	const enByNumber = new Map(enSongs.map((song) => [song.song_number, song]));
	const map = {};

	rwSongs.forEach((song) => {
		const links = {};
		const number = song.song_number;
		if (frByNumber.has(number)) {
			links.fr = `hymnes-fr:${number}`;
		}
		if (enByNumber.has(number)) {
			links.en = `hymnes-en:${number}`;
		}

		if (Object.keys(links).length > 0) {
			map[`hymnes-rw:${number}`] = links;
		}
	});

	return map;
};

const writeJson = (fileName, data) => {
	const targetPath = path.join(srcDir, fileName);
	fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
	console.log(`Wrote ${fileName}:`, Array.isArray(data) ? data.length : Object.keys(data).length);
};

const main = async () => {
	const [frResponse, enResponse] = await Promise.all([fetch(FR_URL), fetch(EN_URL)]);
	if (!frResponse.ok) {
		throw new Error(`Failed to fetch French source: ${frResponse.status} ${frResponse.statusText}`);
	}
	if (!enResponse.ok) {
		throw new Error(`Failed to fetch English source: ${enResponse.status} ${enResponse.statusText}`);
	}

	const [frHtml, enHtml] = await Promise.all([frResponse.text(), enResponse.text()]);
	const rwSongs = JSON.parse(fs.readFileSync(path.join(srcDir, 'songs.json'), 'utf8'));
	const frSongs = parseFrenchSongs(frHtml);
	const enSongs = parseEnglishSongs(enHtml);
	const crossLanguageMap = buildCrossLanguageMap(rwSongs, frSongs, enSongs);

	writeJson('songs_fr.json', frSongs);
	writeJson('songs_en.json', enSongs);
	writeJson('crossLanguageMap.json', crossLanguageMap);

	console.log('French range:', frSongs[0]?.song_number, '-', frSongs[frSongs.length - 1]?.song_number);
	console.log('English range:', enSongs[0]?.song_number, '-', enSongs[enSongs.length - 1]?.song_number);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
