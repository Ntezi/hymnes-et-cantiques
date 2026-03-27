import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_COLLECTION_ID } from './library';

const LEGACY_FAVORITES_KEY = 'favorites';
const FAVORITE_SONG_IDS_KEY = 'favorite_song_ids';
const FAVORITE_SONG_IDS_BACKUP_KEY = 'favorite_song_ids_backup';
const FAVORITES_SCHEMA_VERSION_KEY = 'favorites_schema_version';
const CURRENT_FAVORITES_SCHEMA_VERSION = '2';

const buildSongId = (collectionId: string, songNumber: number) => `${collectionId}:${songNumber}`;

const normalizeFavoriteItem = (
	value: unknown,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): string | null => {
	if (typeof value === 'string' && value.includes(':')) {
		return value;
	}

	if (typeof value === 'number') {
		return buildSongId(defaultCollectionId, value);
	}

	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return buildSongId(defaultCollectionId, parseInt(value, 10));
	}

	return null;
};

const normalizeFavoriteList = (
	values: unknown,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): string[] => {
	if (!Array.isArray(values)) {
		return [];
	}

	const normalized = values
		.map((value) => normalizeFavoriteItem(value, defaultCollectionId))
		.filter((value): value is string => Boolean(value));

	return Array.from(new Set(normalized));
};

const parseAndNormalize = (
	raw: string | null,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): string[] | null => {
	if (raw === null) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return normalizeFavoriteList(parsed, defaultCollectionId);
	} catch {
		return null;
	}
};

const toLegacyFavoriteNumbers = (
	songIds: string[],
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): number[] => {
	const prefix = `${defaultCollectionId}:`;
	const numbers = songIds
		.filter(songId => songId.startsWith(prefix))
		.map(songId => parseInt(songId.slice(prefix.length), 10))
		.filter(number => Number.isFinite(number));

	return Array.from(new Set(numbers));
};

const persistFavoriteState = async (
	songIds: string[],
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<void> => {
	const uniqueSongIds = Array.from(new Set(songIds));
	const legacyNumbers = toLegacyFavoriteNumbers(uniqueSongIds, defaultCollectionId);

	await AsyncStorage.multiSet([
		[FAVORITE_SONG_IDS_KEY, JSON.stringify(uniqueSongIds)],
		[FAVORITE_SONG_IDS_BACKUP_KEY, JSON.stringify(uniqueSongIds)],
		[FAVORITES_SCHEMA_VERSION_KEY, CURRENT_FAVORITES_SCHEMA_VERSION],
		[LEGACY_FAVORITES_KEY, JSON.stringify(legacyNumbers)],
	]);
};

export const loadFavoriteSongIds = async (
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<string[]> => {
	try {
		const [currentRaw, backupRaw, legacyRaw] = await Promise.all([
			AsyncStorage.getItem(FAVORITE_SONG_IDS_KEY),
			AsyncStorage.getItem(FAVORITE_SONG_IDS_BACKUP_KEY),
			AsyncStorage.getItem(LEGACY_FAVORITES_KEY),
		]);

		const fromCurrent = parseAndNormalize(currentRaw, defaultCollectionId);
		const fromBackup = parseAndNormalize(backupRaw, defaultCollectionId);
		const fromLegacy = parseAndNormalize(legacyRaw, defaultCollectionId);

		const resolved = fromCurrent ?? fromBackup ?? fromLegacy ?? [];
		await persistFavoriteState(resolved, defaultCollectionId);
		return resolved;
	} catch (error) {
		console.error('Failed to load favorites.');
		return [];
	}
};

export const saveFavoriteSongIds = async (
	songIds: string[],
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<void> => {
	await persistFavoriteState(songIds, defaultCollectionId);
};
