// Pure logic for same-melody links, kept free of React Native / JSON imports so it can be
// tested with plain node (see scripts/tests/melodyLinkCore.test.mjs).
//
// Links are keyed by hymn number: the rw / fr / en editions share numbering, so one link
// applies to every edition.

export type NumberLinkMap = Record<string, number[]>;

export interface MelodyLinkOverrides {
	added: NumberLinkMap;
	removed: NumberLinkMap;
}

// Shape stored before numbering was shared: keyed by song_id ('hymnes-rw:5').
export type SongIdLinkMap = Record<string, string[]>;
export interface SongIdOverrides {
	added: SongIdLinkMap;
	removed: SongIdLinkMap;
}

export const parseSongNumber = (value: unknown): number | null => {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value > 0 ? value : null;
	}
	if (typeof value !== 'string') {
		return null;
	}
	const match = value.trim().match(/^(?:[^:]+:)?(\d+)$/);
	if (!match) {
		return null;
	}
	const parsed = parseInt(match[1], 10);
	return parsed > 0 ? parsed : null;
};

const uniqueNumbers = (values: number[]): number[] => Array.from(new Set(values));

export const emptyOverrides = (): MelodyLinkOverrides => ({ added: {}, removed: {} });

export const hasOverrides = (overrides: MelodyLinkOverrides): boolean =>
	Object.values(overrides.added).some(links => links.length > 0)
	|| Object.values(overrides.removed).some(links => links.length > 0);

export const buildDefaultNumberMap = (groups: number[][]): NumberLinkMap => {
	const map: NumberLinkMap = {};
	groups.forEach((group) => {
		const numbers = uniqueNumbers(group);
		if (numbers.length < 2) {
			return;
		}
		numbers.forEach((number) => {
			map[number] = uniqueNumbers([
				...(map[number] || []),
				...numbers.filter(other => other !== number),
			]);
		});
	});
	return map;
};

export const normalizeNumberMap = (value: unknown): NumberLinkMap => {
	if (!value || typeof value !== 'object') {
		return {};
	}

	const map: NumberLinkMap = {};
	Object.entries(value as Record<string, unknown>).forEach(([key, links]) => {
		const number = parseSongNumber(key);
		if (number === null || !Array.isArray(links)) {
			return;
		}
		const numbers = uniqueNumbers(
			links
				.map(link => parseSongNumber(link))
				.filter((link): link is number => link !== null && link !== number)
		);
		if (numbers.length > 0) {
			map[number] = uniqueNumbers([...(map[number] || []), ...numbers]);
		}
	});
	return map;
};

// Accepts either the current shape (keys are numbers) or the song_id shape: both parse to numbers,
// and entries from different editions of the same hymn are merged, so nothing is lost.
export const normalizeOverrides = (value: unknown): MelodyLinkOverrides => {
	const candidate = (value && typeof value === 'object' ? value : {}) as Partial<Record<'added' | 'removed', unknown>>;
	return {
		added: normalizeNumberMap(candidate.added),
		removed: normalizeNumberMap(candidate.removed),
	};
};

export const diffLinks = <T>(values: T[], others: T[]): T[] => {
	const other = new Set(others);
	return values.filter(value => !other.has(value));
};

export const resolveEffectiveMap = (defaults: NumberLinkMap, overrides: MelodyLinkOverrides): NumberLinkMap => {
	const numbers = new Set([
		...Object.keys(defaults),
		...Object.keys(overrides.added),
	]);
	const map: NumberLinkMap = {};

	numbers.forEach((key) => {
		const links = diffLinks(
			uniqueNumbers([...(defaults[key] || []), ...(overrides.added[key] || [])]),
			overrides.removed[key] || []
		);
		if (links.length > 0) {
			map[key] = links;
		}
	});

	return map;
};

const setLink = (
	overrides: MelodyLinkOverrides,
	defaults: NumberLinkMap,
	from: number,
	to: number,
	linked: boolean
) => {
	const isDefault = (defaults[from] || []).includes(to);
	const added = new Set(overrides.added[from] || []);
	const removed = new Set(overrides.removed[from] || []);

	if (linked) {
		removed.delete(to);
		if (!isDefault) {
			added.add(to);
		}
	} else {
		added.delete(to);
		if (isDefault) {
			removed.add(to);
		}
	}

	overrides.added[from] = Array.from(added);
	overrides.removed[from] = Array.from(removed);
};

// Returns new overrides after the user sets the full list of hymns linked to `number`.
// Links are symmetric: both directions are kept consistent.
export const applyLinkSelection = (
	defaults: NumberLinkMap,
	overrides: MelodyLinkOverrides,
	number: number,
	nextLinkedNumbers: number[]
): MelodyLinkOverrides => {
	const draft: MelodyLinkOverrides = {
		added: { ...overrides.added },
		removed: { ...overrides.removed },
	};
	const current = resolveEffectiveMap(defaults, draft)[number] || [];
	const next = uniqueNumbers(nextLinkedNumbers.filter(linked => linked !== number));
	const nextSet = new Set(next);

	current.forEach((linked) => {
		if (!nextSet.has(linked)) {
			setLink(draft, defaults, number, linked, false);
			setLink(draft, defaults, linked, number, false);
		}
	});
	next.forEach((linked) => {
		setLink(draft, defaults, number, linked, true);
		setLink(draft, defaults, linked, number, true);
	});

	return normalizeOverrides(draft);
};

// Oldest storage ('melody_links'): a fully materialised song_id map, seeded with defaults.
// Links that only exist because the old defaults seeded them are dropped; what the user added
// or removed is kept (as song_id overrides, to be converted by normalizeOverrides).
export const legacyLinksToSongIdOverrides = (
	legacyMap: SongIdLinkMap,
	wasSeeded: boolean,
	legacyDefaults: SongIdLinkMap
): SongIdOverrides => {
	const added: SongIdLinkMap = {};
	const removed: SongIdLinkMap = {};
	const songIds = new Set([
		...Object.keys(legacyMap),
		...(wasSeeded ? Object.keys(legacyDefaults) : []),
	]);

	songIds.forEach((songId) => {
		const savedLinks = legacyMap[songId] || [];
		const defaults = wasSeeded ? (legacyDefaults[songId] || []) : [];
		const userAdded = diffLinks(savedLinks, defaults);
		const userRemoved = diffLinks(defaults, savedLinks);
		if (userAdded.length > 0) {
			added[songId] = userAdded;
		}
		if (userRemoved.length > 0) {
			removed[songId] = userRemoved;
		}
	});

	return { added, removed };
};
