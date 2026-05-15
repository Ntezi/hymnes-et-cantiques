export interface SongInfo {
	song_number: number;
	speed: number | null;
	sound: string | null;
	paroles_de: string | null;
	musique_de: string | null;
	metres: string | null;
	melodie: string | null;
}

const SONG_INFO_MAP = require('./songInfoMap.json') as Record<string, SongInfo>;

export const getSongInfoByNumber = (songNumber: number | string): SongInfo | null => {
	const numericSongNumber = Number(songNumber);
	if (Number.isFinite(numericSongNumber)) {
		return SONG_INFO_MAP[String(numericSongNumber)] || null;
	}

	return SONG_INFO_MAP[String(songNumber)] || null;
};
