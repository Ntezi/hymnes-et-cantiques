import AsyncStorage from '@react-native-async-storage/async-storage';

export type MelodyLinkMap = Record<string, string[]>;

const MELODY_LINKS_KEY = 'melody_links';

const uniqueSongIds = (songIds: string[]): string[] =>
	Array.from(new Set(songIds.filter(songId => typeof songId === 'string' && songId.trim().length > 0)));

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

const saveMelodyLinkMap = async (map: MelodyLinkMap): Promise<void> => {
	await AsyncStorage.setItem(MELODY_LINKS_KEY, JSON.stringify(normalizeMelodyLinkMap(map)));
};

export const loadMelodyLinkMap = async (): Promise<MelodyLinkMap> => {
	try {
		const raw = await AsyncStorage.getItem(MELODY_LINKS_KEY);
		if (!raw) {
			return {};
		}

		return normalizeMelodyLinkMap(JSON.parse(raw));
	} catch {
		return {};
	}
};

export const getSameMelodySongIds = (songId: string, melodyLinkMap: MelodyLinkMap): string[] =>
	melodyLinkMap[songId] || [];

export const setSameMelodySongIds = async (
	songId: string,
	nextLinkedSongIds: string[]
): Promise<MelodyLinkMap> => {
	const currentMap = await loadMelodyLinkMap();
	const currentLinkedIds = new Set(getSameMelodySongIds(songId, currentMap));
	const nextLinkedIds = new Set(uniqueSongIds(nextLinkedSongIds.filter(linkedSongId => linkedSongId !== songId)));

	currentLinkedIds.forEach((linkedSongId) => {
		if (nextLinkedIds.has(linkedSongId)) {
			return;
		}

		const peerLinks = new Set(currentMap[linkedSongId] || []);
		peerLinks.delete(songId);
		if (peerLinks.size === 0) {
			delete currentMap[linkedSongId];
			return;
		}

		currentMap[linkedSongId] = Array.from(peerLinks);
	});

	nextLinkedIds.forEach((linkedSongId) => {
		const peerLinks = new Set(currentMap[linkedSongId] || []);
		peerLinks.add(songId);
		currentMap[linkedSongId] = Array.from(peerLinks);
	});

	if (nextLinkedIds.size === 0) {
		delete currentMap[songId];
	} else {
		currentMap[songId] = Array.from(nextLinkedIds);
	}

	const normalized = normalizeMelodyLinkMap(currentMap);
	await saveMelodyLinkMap(normalized);
	return normalized;
};
