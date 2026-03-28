export interface TimedLyricLine {
	line_key: string;
	start_ms: number;
	end_ms: number;
}

export interface SongMelodyMetadata {
	song_id: string;
	melody_url: string;
	source_label: string;
	source_url?: string;
	french_ref?: number;
	has_timing: boolean;
	timed_lines: TimedLyricLine[];
}

const SONG_MELODY_METADATA = require('./melodyMetadata.json') as Record<string, SongMelodyMetadata>;

export const getSongMelodyMetadata = (songId: string): SongMelodyMetadata | null =>
	SONG_MELODY_METADATA[songId] || null;

export const getActiveTimedLineKey = (songId: string, positionMs: number): string | null => {
	const melodyMetadata = getSongMelodyMetadata(songId);
	if (!melodyMetadata || !melodyMetadata.has_timing) {
		return null;
	}

	const activeLine = melodyMetadata.timed_lines.find(
		(line) => positionMs >= line.start_ms && positionMs < line.end_ms
	);

	return activeLine?.line_key || null;
};
