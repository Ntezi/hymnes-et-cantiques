import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SONG_IDS_KEY = 'recent_song_ids';
const MAX_RECENT_SONGS = 20;

const normalizeRecentSongIds = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized = value
		.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
		.map(item => item.trim());

	return Array.from(new Set(normalized));
};

const readRecentSongIds = async (): Promise<string[]> => {
	try {
		const raw = await AsyncStorage.getItem(RECENT_SONG_IDS_KEY);
		if (!raw) {
			return [];
		}

		return normalizeRecentSongIds(JSON.parse(raw));
	} catch {
		return [];
	}
};

export const loadRecentSongIds = async (): Promise<string[]> => readRecentSongIds();

export const addRecentSongId = async (songId: string): Promise<string[]> => {
	const current = await readRecentSongIds();
	const next = [songId, ...current.filter(id => id !== songId)].slice(0, MAX_RECENT_SONGS);

	try {
		await AsyncStorage.setItem(RECENT_SONG_IDS_KEY, JSON.stringify(next));
	} catch {
		// ignore write failures; caller still gets updated in-memory list
	}

	return next;
};
