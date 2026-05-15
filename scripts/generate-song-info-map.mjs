import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_SOURCE_JSON = '/Users/ntezi/Dev/PYTHON/lyrics-parser/hymnes_et_cantiques.json';
const DEFAULT_OUTPUT_JSON = path.join(repoRoot, 'src', 'songInfoMap.json');

const sourceJsonPath = process.argv[2] || DEFAULT_SOURCE_JSON;
const outputJsonPath = process.argv[3] || DEFAULT_OUTPUT_JSON;

const clean = (value) => {
	if (typeof value !== 'string') {
		return null;
	}
	const normalized = value.replace(/\(cid:\d+\)/g, '').replace(/\s+/g, ' ').trim();
	return normalized.length > 0 ? normalized : null;
};

const extractSpeed = (fullText) => {
	if (typeof fullText !== 'string') {
		return null;
	}
	const match = fullText.match(/(?:^|\n)\s*=\s*(\d{2,3})(?:\b|\s|$)/);
	if (!match) {
		return null;
	}
	const speed = Number(match[1]);
	return Number.isFinite(speed) ? speed : null;
};

const normalizeSound = (line) => {
	if (typeof line !== 'string') {
		return null;
	}
	const stripped = line
		.replace(/\b(?:pp|p|mp|mf|f|ff)\b$/gi, '')
		.replace(/[\d.]+$/g, '')
		.trim();
	if (stripped.length < 3) {
		return null;
	}
	return stripped;
};

const extractSound = (fullText) => {
	if (typeof fullText !== 'string') {
		return null;
	}

	const lines = fullText
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(Boolean);

	const speedLineIndex = lines.findIndex(line => /^=\s*\d{2,3}\b/.test(line));
	if (speedLineIndex === -1) {
		return null;
	}

	for (let i = speedLineIndex + 1; i < Math.min(lines.length, speedLineIndex + 6); i += 1) {
		const candidate = normalizeSound(lines[i]);
		if (candidate) {
			return candidate;
		}
	}

	return null;
};

const run = () => {
	if (!fs.existsSync(sourceJsonPath)) {
		throw new Error(`Source JSON not found: ${sourceJsonPath}`);
	}

	const raw = fs.readFileSync(sourceJsonPath, 'utf8');
	const sourceEntries = JSON.parse(raw);
	if (!Array.isArray(sourceEntries)) {
		throw new Error(`Unexpected source format, expected array in ${sourceJsonPath}`);
	}

	const sorted = [...sourceEntries].sort((a, b) => Number(a.id) - Number(b.id));
	const output = {};

	for (const entry of sorted) {
		const songNumber = Number(entry.id);
		if (!Number.isFinite(songNumber)) {
			continue;
		}

		output[String(songNumber)] = {
			song_number: songNumber,
			speed: extractSpeed(entry.full_text),
			sound: extractSound(entry.full_text),
			paroles_de: clean(entry.lyrics_author),
			musique_de: clean(entry.music_composer),
			metres: clean(entry.meters),
			melodie: clean(entry.melody),
		};
	}

	fs.writeFileSync(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
	console.log(`Generated song info map for ${Object.keys(output).length} songs.`);
	console.log(`Output: ${outputJsonPath}`);
};

run();
