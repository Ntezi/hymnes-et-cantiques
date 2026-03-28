import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ToneMidi from '@tonejs/midi';

const { Midi } = ToneMidi;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_MIDI_DIR = '/Users/ntezi/Dev/PYTHON/lyrics-parser/midi';
const DEFAULT_OUTPUT_PATH = path.join(repoRoot, 'src', 'melodyMetadata.generated.json');

const midiDir = process.argv[2] || DEFAULT_MIDI_DIR;
const outputPath = process.argv[3] || DEFAULT_OUTPUT_PATH;

const REPEAT_MARKER_SPLIT_REGEX = /(\((?:bis|ter|x\d+)\)|\bbis\b|\bter\b|\bx\d+\b|R:\/?)/gi;
const REPEAT_MARKER_REGEX = /^(\((?:bis|ter|x\d+)\)|bis|ter|x\d+|R:\/?)$/i;

const COLLECTION_SONG_FILES = [
	{ collectionId: 'hymnes-rw', file: path.join(repoRoot, 'src', 'songs.json') },
	{ collectionId: 'hymnes-fr', file: path.join(repoRoot, 'src', 'songs_fr.json') },
	{ collectionId: 'hymnes-en', file: path.join(repoRoot, 'src', 'songs_en.json') },
];

const tokenizeLyricWords = (text) =>
	text
		.split(REPEAT_MARKER_SPLIT_REGEX)
		.filter((segment) => segment.length > 0)
		.flatMap((segment) => {
			if (REPEAT_MARKER_REGEX.test(segment.trim())) {
				return [];
			}

			return segment
				.split(/\s+/)
				.map((word) => word.trim())
				.filter(Boolean);
		});

const getSongLines = (song) => {
	const lines = [];

	song.verses.forEach((verse, verseIndex) => {
		const verseLines = verse
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		verseLines.forEach((lineText, lineIndex) => {
			lines.push({
				line_key: `${verseIndex}-${lineIndex}`,
				line_text: lineText,
				word_count: tokenizeLyricWords(lineText).length,
			});
		});
	});

	return lines;
};

const listMidiFilesBySongNumber = (targetMidiDir) => {
	const midiBySongNumber = new Map();
	const files = fs.readdirSync(targetMidiDir).filter((file) => /\.mid$/i.test(file)).sort();

	for (const file of files) {
		const match = file.match(/HeC_(\d{3})(bis)?[^/]*\.mid$/i);
		if (!match) {
			continue;
		}

		const songNumber = Number(match[1]);
		const isBisVariant = Boolean(match[2]);
		const absolutePath = path.join(targetMidiDir, file);
		const existing = midiBySongNumber.get(songNumber);

		if (!existing || (!isBisVariant && existing.isBisVariant)) {
			midiBySongNumber.set(songNumber, {
				absolutePath,
				file,
				isBisVariant,
			});
		}
	}

	return midiBySongNumber;
};

const parseMidiNotes = (midiPath) => {
	const midi = new Midi(fs.readFileSync(midiPath));
	const rawNotes = midi.tracks
		.flatMap((track) => track.notes)
		.map((note) => ({
			startSeconds: Number(note.time),
			endSeconds: Number(note.time) + Number(note.duration),
		}))
		.filter((note) => Number.isFinite(note.startSeconds) && Number.isFinite(note.endSeconds))
		.sort((a, b) => a.startSeconds - b.startSeconds);

	if (rawNotes.length === 0) {
		return [];
	}

	const baselineSeconds = rawNotes[0].startSeconds;

	return rawNotes.map((note) => {
		const startMs = Math.max(0, Math.round((note.startSeconds - baselineSeconds) * 1000));
		const endMs = Math.max(startMs + 200, Math.round((note.endSeconds - baselineSeconds) * 1000));
		return { start_ms: startMs, end_ms: endMs };
	});
};

const buildTimedLinesFromMidi = (songLines, midiNotes) => {
	if (songLines.length === 0 || midiNotes.length === 0) {
		return [];
	}

	const lineWeights = songLines.map((line) => Math.max(1, line.word_count));
	const totalWeight = lineWeights.reduce((acc, weight) => acc + weight, 0);
	let consumedWeight = 0;

	return songLines.map((line, index) => {
		const weight = lineWeights[index];
		const startRatio = consumedWeight / totalWeight;
		consumedWeight += weight;
		const endRatio = consumedWeight / totalWeight;

		const startNoteIndex = Math.min(
			midiNotes.length - 1,
			Math.max(0, Math.floor(startRatio * midiNotes.length))
		);
		const endNoteIndex = Math.min(
			midiNotes.length - 1,
			Math.max(startNoteIndex, Math.floor(endRatio * midiNotes.length) - 1)
		);

		const startMs = midiNotes[startNoteIndex].start_ms;
		const endMs = Math.max(startMs + 250, midiNotes[endNoteIndex].end_ms);

		return {
			line_key: line.line_key,
			start_ms: startMs,
			end_ms: endMs,
		};
	});
};

const readSongs = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const run = () => {
	if (!fs.existsSync(midiDir)) {
		throw new Error(`MIDI directory not found: ${midiDir}`);
	}

	const midiBySongNumber = listMidiFilesBySongNumber(midiDir);
	const output = {};
	let generatedCount = 0;
	const stats = [];

	for (const collectionConfig of COLLECTION_SONG_FILES) {
		const songs = readSongs(collectionConfig.file);
		let collectionGenerated = 0;

		for (const song of songs) {
			const midiRef = midiBySongNumber.get(song.song_number);
			if (!midiRef) {
				continue;
			}

			const songLines = getSongLines(song);
			if (songLines.length === 0) {
				continue;
			}

			const midiNotes = parseMidiNotes(midiRef.absolutePath);
			const timedLines = buildTimedLinesFromMidi(songLines, midiNotes);
			if (timedLines.length === 0) {
				continue;
			}

			const songId = `${collectionConfig.collectionId}:${song.song_number}`;
			output[songId] = {
				song_id: songId,
				melody_url: '',
				source_label: 'Local piano timing (MIDI-derived)',
				source_url: midiRef.file,
				french_ref: song.song_number,
				has_timing: true,
				timed_lines: timedLines,
			};

			generatedCount += 1;
			collectionGenerated += 1;
		}

		stats.push({ collection: collectionConfig.collectionId, count: collectionGenerated });
	}

	fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

	console.log(`Generated melody timing metadata for ${generatedCount} songs.`);
	stats.forEach((entry) => {
		console.log(`- ${entry.collection}: ${entry.count}`);
	});
	console.log(`Output: ${outputPath}`);
};

run();
