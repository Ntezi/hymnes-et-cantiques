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
