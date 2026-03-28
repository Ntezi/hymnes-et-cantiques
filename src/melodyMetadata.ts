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

const GENERATED_SONG_MELODY_METADATA =
	require('./melodyMetadata.generated.json') as Record<string, SongMelodyMetadata>;
const MANUAL_SONG_MELODY_METADATA =
	require('./melodyMetadata.json') as Record<string, SongMelodyMetadata>;
const SONG_MELODY_METADATA: Record<string, SongMelodyMetadata> = {
	...GENERATED_SONG_MELODY_METADATA,
	...MANUAL_SONG_MELODY_METADATA,
};

export const getSongMelodyMetadata = (songId: string): SongMelodyMetadata | null =>
	SONG_MELODY_METADATA[songId] || null;

export const getActiveTimedLine = (songId: string, positionMs: number): TimedLyricLine | null => {
	const melodyMetadata = getSongMelodyMetadata(songId);
	if (!melodyMetadata || !melodyMetadata.has_timing) {
		return null;
	}

	return melodyMetadata.timed_lines.find(
		(line) => positionMs >= line.start_ms && positionMs < line.end_ms
	) || null;
};

export const getActiveTimedLineKey = (songId: string, positionMs: number): string | null => {
	return getActiveTimedLine(songId, positionMs)?.line_key || null;
};
