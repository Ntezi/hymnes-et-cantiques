import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_COLLECTION_ID } from './library';
import { loadFavoriteSongIds, saveFavoriteSongIds } from './favorites';

export interface FavoriteCategory {
	id: string;
	name: string;
	songIds: string[];
	createdAt: string;
}

const FAVORITE_CATEGORIES_KEY = 'favorite_categories';
const FAVORITE_CATEGORIES_BACKUP_KEY = 'favorite_categories_backup';
const DEFAULT_CATEGORY_NAME = 'My Favorites';

const uniqueSongIds = (songIds: string[]): string[] =>
	Array.from(new Set(songIds.filter(songId => typeof songId === 'string' && songId.trim().length > 0)));

const sanitizeCategoryName = (name: string): string => name.trim().slice(0, 60);

const normalizeCategory = (value: unknown): FavoriteCategory | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as {
		id?: unknown;
		name?: unknown;
		songIds?: unknown;
		createdAt?: unknown;
	};

	if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
		return null;
	}

	const categoryName = typeof candidate.name === 'string'
		? sanitizeCategoryName(candidate.name)
		: '';

	if (!categoryName) {
		return null;
	}

	const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt.trim().length > 0
		? candidate.createdAt
		: new Date().toISOString();

	const songIds = Array.isArray(candidate.songIds)
		? uniqueSongIds(candidate.songIds.filter((songId): songId is string => typeof songId === 'string'))
		: [];

	return {
		id: candidate.id,
		name: categoryName,
		songIds,
		createdAt,
	};
};

const normalizeCategories = (value: unknown): FavoriteCategory[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized = value
		.map(normalizeCategory)
		.filter((category): category is FavoriteCategory => Boolean(category));

	const seenIds = new Set<string>();
	const deduped: FavoriteCategory[] = [];

	normalized.forEach((category) => {
		if (seenIds.has(category.id)) {
			return;
		}
		seenIds.add(category.id);
		deduped.push(category);
	});

	return deduped;
};

const parseCategories = (raw: string | null): FavoriteCategory[] | null => {
	if (raw === null) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return normalizeCategories(parsed);
	} catch {
		return null;
	}
};

const categorySongIds = (categories: FavoriteCategory[]): string[] =>
	uniqueSongIds(categories.flatMap(category => category.songIds));

const upsertLegacySongsIntoCategories = (
	categories: FavoriteCategory[],
	legacyFavoriteSongIds: string[]
): FavoriteCategory[] => {
	const normalizedLegacySongIds = uniqueSongIds(legacyFavoriteSongIds);
	if (normalizedLegacySongIds.length === 0) {
		return categories;
	}

	const categorySongs = new Set(categorySongIds(categories));
	const missingSongIds = normalizedLegacySongIds.filter(songId => !categorySongs.has(songId));
	if (missingSongIds.length === 0) {
		return categories;
	}

	const existingDefaultCategory = categories.find(category => category.name === DEFAULT_CATEGORY_NAME);
	if (existingDefaultCategory) {
		return categories.map((category) => {
			if (category.id !== existingDefaultCategory.id) {
				return category;
			}

			return {
				...category,
				songIds: uniqueSongIds([...category.songIds, ...missingSongIds]),
			};
		});
	}

	return [
		{
			id: `cat-${Date.now()}`,
			name: DEFAULT_CATEGORY_NAME,
			songIds: missingSongIds,
			createdAt: new Date().toISOString(),
		},
		...categories,
	];
};

const persistFavoriteCategories = async (
	categories: FavoriteCategory[],
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const normalized = normalizeCategories(categories);
	const allSongIds = categorySongIds(normalized);

	await AsyncStorage.multiSet([
		[FAVORITE_CATEGORIES_KEY, JSON.stringify(normalized)],
		[FAVORITE_CATEGORIES_BACKUP_KEY, JSON.stringify(normalized)],
	]);

	await saveFavoriteSongIds(allSongIds, defaultCollectionId);
	return normalized;
};

export const loadFavoriteCategories = async (
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	try {
		const [currentRaw, backupRaw, legacyFavoriteSongIds] = await Promise.all([
			AsyncStorage.getItem(FAVORITE_CATEGORIES_KEY),
			AsyncStorage.getItem(FAVORITE_CATEGORIES_BACKUP_KEY),
			loadFavoriteSongIds(defaultCollectionId),
		]);

		const fromCurrent = parseCategories(currentRaw);
		const fromBackup = parseCategories(backupRaw);
		let resolved = fromCurrent ?? fromBackup ?? [];
		resolved = upsertLegacySongsIntoCategories(resolved, legacyFavoriteSongIds);

		return await persistFavoriteCategories(resolved, defaultCollectionId);
	} catch {
		return [];
	}
};

export const createFavoriteCategory = async (
	name: string,
	initialSongIds: string[] = [],
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const categoryName = sanitizeCategoryName(name);
	if (!categoryName) {
		return loadFavoriteCategories(defaultCollectionId);
	}

	const current = await loadFavoriteCategories(defaultCollectionId);
	const nextCategory: FavoriteCategory = {
		id: `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
		name: categoryName,
		songIds: uniqueSongIds(initialSongIds),
		createdAt: new Date().toISOString(),
	};

	return persistFavoriteCategories([...current, nextCategory], defaultCollectionId);
};

export const renameFavoriteCategory = async (
	categoryId: string,
	newName: string,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const categoryName = sanitizeCategoryName(newName);
	if (!categoryName) {
		return loadFavoriteCategories(defaultCollectionId);
	}

	const current = await loadFavoriteCategories(defaultCollectionId);
	const next = current.map((category) =>
		category.id === categoryId
			? {
				...category,
				name: categoryName,
			}
			: category
	);

	return persistFavoriteCategories(next, defaultCollectionId);
};

export const deleteFavoriteCategory = async (
	categoryId: string,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const current = await loadFavoriteCategories(defaultCollectionId);
	const next = current.filter(category => category.id !== categoryId);
	return persistFavoriteCategories(next, defaultCollectionId);
};

export const addSongToFavoriteCategory = async (
	categoryId: string,
	songId: string,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const current = await loadFavoriteCategories(defaultCollectionId);
	const next = current.map((category) => {
		if (category.id !== categoryId) {
			return category;
		}

		if (category.songIds.includes(songId)) {
			return category;
		}

		return {
			...category,
			songIds: [...category.songIds, songId],
		};
	});

	return persistFavoriteCategories(next, defaultCollectionId);
};

export const removeSongFromFavoriteCategory = async (
	categoryId: string,
	songId: string,
	defaultCollectionId: string = DEFAULT_COLLECTION_ID
): Promise<FavoriteCategory[]> => {
	const current = await loadFavoriteCategories(defaultCollectionId);
	const next = current.map((category) => {
		if (category.id !== categoryId) {
			return category;
		}

		return {
			...category,
			songIds: category.songIds.filter(id => id !== songId),
		};
	});

	return persistFavoriteCategories(next, defaultCollectionId);
};

export const getSongFavoriteCategories = (
	categories: FavoriteCategory[],
	songId: string
): FavoriteCategory[] => categories.filter(category => category.songIds.includes(songId));

export const isSongInAnyFavoriteCategory = (
	categories: FavoriteCategory[],
	songId: string
): boolean => categories.some(category => category.songIds.includes(songId));
