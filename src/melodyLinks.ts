import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTION_CATALOG } from './library';
import melodyGroupsData from './melodyGroups.json';
import {
	applyLinkSelection,
	buildDefaultNumberMap,
	emptyOverrides,
	hasOverrides,
	legacyLinksToSongIdOverrides,
	MelodyLinkOverrides,
	NumberLinkMap,
	normalizeOverrides,
	parseSongNumber,
	resolveEffectiveMap,
	SongIdLinkMap,
} from './melodyLinkCore';

// Effective links keyed by hymn number (shared by the rw / fr / en editions).
export type MelodyLinkMap = NumberLinkMap;

/**
 * Same-melody links = confirmed groups (src/melodyGroups.json) + user additions - user removals.
 *
 * Only the user's own edits are persisted, so the default groups can be corrected in a new
 * app version without being overwritten by (or overwriting) what the user linked themselves.
 * Overrides are keyed by hymn number so an edit applies to every edition.
 */
const MELODY_LINK_OVERRIDES_KEY = 'melody_link_overrides_v2';
// Previous storage: overrides keyed by song_id ('hymnes-rw:5'). Kept on disk after migration as a backup.
const SONG_ID_OVERRIDES_KEY = 'melody_link_overrides';

// Storage used by the previous implementation (fully materialized map seeded with defaults).
const LEGACY_MELODY_LINKS_KEY = 'melody_links';
const LEGACY_SEED_VERSION_KEY = 'melody_links_seed_version';
const LEGACY_SEEDED_VERSION = '1';
const LEGACY_DEFAULT_GROUPS: number[][] = [
	[9, 48],
	[13, 29],
	[16, 99],
	[20, 126, 139],
	[21, 216],
	[27, 127],
	[36, 37],
	[55, 77],
	[60, 150],
	[75, 91],
	[87, 88],
	[103, 117],
	[104, 140],
	[151, 159],
	[165, 195],
	[188, 192],
	[207, 238],
];

// All editions (rw / fr / en) share the hymnal numbering, so a melody group applies to each collection.
const MELODY_GROUPS: number[][] = (melodyGroupsData as { groups: number[][] }).groups;

const KNOWN_SONG_IDS = new Set(
	COLLECTION_CATALOG.flatMap(collection => collection.songs.map(song => song.song_id))
);

const uniqueSongIds = (songIds: string[]): string[] =>
	Array.from(new Set(songIds.filter(songId => typeof songId === 'string' && songId.trim().length > 0)));

const DEFAULT_MELODY_LINK_MAP: MelodyLinkMap = buildDefaultNumberMap(MELODY_GROUPS);

const buildLegacyDefaultMap = (): SongIdLinkMap => {
	const map: SongIdLinkMap = {};
	LEGACY_DEFAULT_GROUPS.forEach((group) => {
		const songIds = uniqueSongIds(group.map(songNumber => `hymnes-rw:${songNumber}`))
			.filter(songId => KNOWN_SONG_IDS.has(songId));
		if (songIds.length < 2) {
			return;
		}
		songIds.forEach((songId) => {
			map[songId] = uniqueSongIds([
				...(map[songId] || []),
				...songIds.filter(linkedSongId => linkedSongId !== songId),
			]);
		});
	});
	return map;
};

const normalizeSongIdMap = (value: unknown): SongIdLinkMap => {
	if (!value || typeof value !== 'object') {
		return {};
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([songId]) => songId.trim().length > 0)
		.map(([songId, links]) => {
			const normalizedLinks = Array.isArray(links)
				? uniqueSongIds(links.filter((link): link is string => typeof link === 'string').filter(link => link !== songId))
				: [];

			return [songId, normalizedLinks] as const;
		})
		.filter(([, links]) => links.length > 0);

	return Object.fromEntries(entries);
};

const saveOverrides = async (overrides: MelodyLinkOverrides): Promise<void> => {
	await AsyncStorage.setItem(MELODY_LINK_OVERRIDES_KEY, JSON.stringify(normalizeOverrides(overrides)));
};

/**
 * Convert storage written by the previous implementation into user overrides.
 * Links that only existed because the old defaults seeded them are dropped (the new
 * defaults replace them); everything the user added or removed is kept.
 */
const migrateLegacyStorage = async (): Promise<MelodyLinkOverrides | null> => {
	const [legacyRaw, legacySeedVersion] = await Promise.all([
		AsyncStorage.getItem(LEGACY_MELODY_LINKS_KEY),
		AsyncStorage.getItem(LEGACY_SEED_VERSION_KEY),
	]);
	if (!legacyRaw) {
		return null;
	}

	return normalizeOverrides(
		legacyLinksToSongIdOverrides(
			normalizeSongIdMap(JSON.parse(legacyRaw)),
			legacySeedVersion === LEGACY_SEEDED_VERSION,
			buildLegacyDefaultMap()
		)
	);
};

const loadOverrides = async (): Promise<MelodyLinkOverrides> => {
	const raw = await AsyncStorage.getItem(MELODY_LINK_OVERRIDES_KEY);
	if (raw) {
		return normalizeOverrides(JSON.parse(raw));
	}

	// First run of this version: bring over overrides keyed by song_id, merging editions by hymn number.
	const songIdRaw = await AsyncStorage.getItem(SONG_ID_OVERRIDES_KEY);
	const migrated = songIdRaw ? normalizeOverrides(JSON.parse(songIdRaw)) : await migrateLegacyStorage();
	const overrides = migrated || emptyOverrides();
	await saveOverrides(overrides);
	if (!songIdRaw && migrated) {
		await AsyncStorage.multiRemove([LEGACY_MELODY_LINKS_KEY, LEGACY_SEED_VERSION_KEY]).catch(() => undefined);
	}
	return overrides;
};

// Song ids of the same edition as `songId` for the given hymn numbers (only hymns that exist there).
const toSongIds = (songId: string, numbers: number[]): string[] => {
	const collectionId = songId.split(':')[0];
	return numbers
		.map(number => `${collectionId}:${number}`)
		.filter(linkedSongId => KNOWN_SONG_IDS.has(linkedSongId));
};

export const getDefaultSameMelodySongIds = (songId: string): string[] => {
	const number = parseSongNumber(songId);
	return number === null ? [] : toSongIds(songId, DEFAULT_MELODY_LINK_MAP[number] || []);
};

export const loadMelodyLinkMap = async (): Promise<MelodyLinkMap> => {
	try {
		const overrides = await loadOverrides();
		return resolveEffectiveMap(DEFAULT_MELODY_LINK_MAP, overrides);
	} catch {
		return DEFAULT_MELODY_LINK_MAP;
	}
};

export const getSameMelodySongIds = (songId: string, melodyLinkMap: MelodyLinkMap): string[] => {
	const number = parseSongNumber(songId);
	return number === null ? [] : toSongIds(songId, melodyLinkMap[number] || []);
};

export const setSameMelodySongIds = async (
	songId: string,
	nextLinkedSongIds: string[]
): Promise<MelodyLinkMap> => {
	const number = parseSongNumber(songId);
	if (number === null) {
		return loadMelodyLinkMap();
	}

	const overrides = await loadOverrides();
	const nextNumbers = nextLinkedSongIds
		.map(linkedSongId => parseSongNumber(linkedSongId))
		.filter((linked): linked is number => linked !== null);
	const updated = applyLinkSelection(DEFAULT_MELODY_LINK_MAP, overrides, number, nextNumbers);
	await saveOverrides(updated);
	return resolveEffectiveMap(DEFAULT_MELODY_LINK_MAP, updated);
};

export const hasUserMelodyOverrides = async (): Promise<boolean> => {
	try {
		return hasOverrides(await loadOverrides());
	} catch {
		return false;
	}
};

// Clears only the user's own additions/removals; the confirmed groups are untouched.
export const resetUserMelodyOverrides = async (): Promise<MelodyLinkMap> => {
	await saveOverrides(emptyOverrides());
	return DEFAULT_MELODY_LINK_MAP;
};
