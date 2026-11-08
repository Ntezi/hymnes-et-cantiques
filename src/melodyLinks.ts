import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTION_CATALOG } from './library';
import melodyGroupsData from './melodyGroups.json';

export type MelodyLinkMap = Record<string, string[]>;

interface MelodyLinkOverrides {
	added: MelodyLinkMap;
	removed: MelodyLinkMap;
}

/**
 * Same-melody links = hymnal defaults (src/melodyGroups.json) + user additions - user removals.
 *
 * Only the user's own edits are persisted, so the default groups can be corrected in a new
 * app version without being overwritten by (or overwriting) what the user linked themselves.
 */
const MELODY_LINK_OVERRIDES_KEY = 'melody_link_overrides';

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

const uniqueSongIds = (songIds: string[]): string[] =>
	Array.from(new Set(songIds.filter(songId => typeof songId === 'string' && songId.trim().length > 0)));

const buildGroupLinkMap = (groups: number[][], collectionIds: string[]): MelodyLinkMap => {
	const knownSongIds = new Set(
		COLLECTION_CATALOG.flatMap(collection => collection.songs.map(song => song.song_id))
	);
	const map: MelodyLinkMap = {};

	collectionIds.forEach((collectionId) => {
		groups.forEach((group) => {
			const songIds = uniqueSongIds(group.map(songNumber => `${collectionId}:${songNumber}`))
				.filter(songId => knownSongIds.has(songId));
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
	});

	return map;
};

const DEFAULT_MELODY_LINK_MAP: MelodyLinkMap = buildGroupLinkMap(
	MELODY_GROUPS,
	COLLECTION_CATALOG.map(collection => collection.id)
);

const LEGACY_DEFAULT_MELODY_LINK_MAP: MelodyLinkMap = buildGroupLinkMap(LEGACY_DEFAULT_GROUPS, ['hymnes-rw']);

const normalizeMelodyLinkMap = (value: unknown): MelodyLinkMap => {
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

const normalizeOverrides = (value: unknown): MelodyLinkOverrides => {
	const candidate = (value && typeof value === 'object' ? value : {}) as Partial<MelodyLinkOverrides>;
	return {
		added: normalizeMelodyLinkMap(candidate.added),
		removed: normalizeMelodyLinkMap(candidate.removed),
	};
};

const diffLinks = (songIds: string[], otherSongIds: string[]): string[] => {
	const other = new Set(otherSongIds);
	return songIds.filter(songId => !other.has(songId));
};

const resolveEffectiveMap = (overrides: MelodyLinkOverrides): MelodyLinkMap => {
	const songIds = new Set([
		...Object.keys(DEFAULT_MELODY_LINK_MAP),
		...Object.keys(overrides.added),
	]);
	const map: MelodyLinkMap = {};

	songIds.forEach((songId) => {
		const links = diffLinks(
			uniqueSongIds([
				...(DEFAULT_MELODY_LINK_MAP[songId] || []),
				...(overrides.added[songId] || []),
			]),
			overrides.removed[songId] || []
		);
		if (links.length > 0) {
			map[songId] = links;
		}
	});

	return map;
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

	const legacyMap = normalizeMelodyLinkMap(JSON.parse(legacyRaw));
	const wasSeeded = legacySeedVersion === LEGACY_SEEDED_VERSION;
	const added: MelodyLinkMap = {};
	const removed: MelodyLinkMap = {};

	const songIds = new Set([
		...Object.keys(legacyMap),
		...(wasSeeded ? Object.keys(LEGACY_DEFAULT_MELODY_LINK_MAP) : []),
	]);
	songIds.forEach((songId) => {
		const savedLinks = legacyMap[songId] || [];
		const legacyDefaults = wasSeeded ? (LEGACY_DEFAULT_MELODY_LINK_MAP[songId] || []) : [];
		const userAdded = diffLinks(savedLinks, legacyDefaults);
		const userRemoved = diffLinks(legacyDefaults, savedLinks);
		if (userAdded.length > 0) {
			added[songId] = userAdded;
		}
		if (userRemoved.length > 0) {
			removed[songId] = userRemoved;
		}
	});

	return { added, removed };
};

const loadOverrides = async (): Promise<MelodyLinkOverrides> => {
	const raw = await AsyncStorage.getItem(MELODY_LINK_OVERRIDES_KEY);
	if (raw) {
		return normalizeOverrides(JSON.parse(raw));
	}

	const migrated = await migrateLegacyStorage();
	const overrides = migrated || { added: {}, removed: {} };
	await saveOverrides(overrides);
	if (migrated) {
		await AsyncStorage.multiRemove([LEGACY_MELODY_LINKS_KEY, LEGACY_SEED_VERSION_KEY]).catch(() => undefined);
	}
	return overrides;
};

export const getDefaultSameMelodySongIds = (songId: string): string[] =>
	DEFAULT_MELODY_LINK_MAP[songId] || [];

export const loadMelodyLinkMap = async (): Promise<MelodyLinkMap> => {
	try {
		const overrides = await loadOverrides();
		return resolveEffectiveMap(overrides);
	} catch {
		return DEFAULT_MELODY_LINK_MAP;
	}
};

export const getSameMelodySongIds = (songId: string, melodyLinkMap: MelodyLinkMap): string[] =>
	melodyLinkMap[songId] || [];

const setLink = (overrides: MelodyLinkOverrides, fromSongId: string, toSongId: string, linked: boolean) => {
	const isDefault = (DEFAULT_MELODY_LINK_MAP[fromSongId] || []).includes(toSongId);
	const added = new Set(overrides.added[fromSongId] || []);
	const removed = new Set(overrides.removed[fromSongId] || []);

	if (linked) {
		removed.delete(toSongId);
		if (!isDefault) {
			added.add(toSongId);
		}
	} else {
		added.delete(toSongId);
		if (isDefault) {
			removed.add(toSongId);
		}
	}

	overrides.added[fromSongId] = Array.from(added);
	overrides.removed[fromSongId] = Array.from(removed);
};

export const setSameMelodySongIds = async (
	songId: string,
	nextLinkedSongIds: string[]
): Promise<MelodyLinkMap> => {
	const overrides = await loadOverrides();
	const currentLinkedIds = getSameMelodySongIds(songId, resolveEffectiveMap(overrides));
	const nextLinkedIds = uniqueSongIds(nextLinkedSongIds.filter(linkedSongId => linkedSongId !== songId));
	const nextSet = new Set(nextLinkedIds);

	// Links are symmetric: keep both directions consistent.
	currentLinkedIds.forEach((linkedSongId) => {
		if (!nextSet.has(linkedSongId)) {
			setLink(overrides, songId, linkedSongId, false);
			setLink(overrides, linkedSongId, songId, false);
		}
	});
	nextLinkedIds.forEach((linkedSongId) => {
		setLink(overrides, songId, linkedSongId, true);
		setLink(overrides, linkedSongId, songId, true);
	});

	const normalized = normalizeOverrides(overrides);
	await saveOverrides(normalized);
	return resolveEffectiveMap(normalized);
};
