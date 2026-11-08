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

// The Ewe edition shares numbering and the same piano audio, but has no timing generated from its own text.
// Reuse the Kinyarwanda entry of the same number (only its total duration is used).
const EWE_COLLECTION_PREFIX = 'hymnes-ee:';

export const getSongMelodyMetadata = (songId: string): SongMelodyMetadata | null => {
	const direct = SONG_MELODY_METADATA[songId];
	if (direct) {
		return direct;
	}
	if (songId.startsWith(EWE_COLLECTION_PREFIX)) {
		return SONG_MELODY_METADATA[`hymnes-rw:${songId.slice(EWE_COLLECTION_PREFIX.length)}`] || null;
	}
	return null;
};
