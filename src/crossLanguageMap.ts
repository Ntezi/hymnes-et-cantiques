import { LanguageCode } from './library';

type RawCrossLanguageEntry = {
	rw?: string;
	fr?: string;
	en?: string;
};

const RAW_CROSS_LANGUAGE_MAP = require('./crossLanguageMap.json') as Record<string, RawCrossLanguageEntry>;

const COLLECTION_LANGUAGE_BY_ID: Record<string, LanguageCode> = {
	'hymnes-rw': 'rw',
	'hymnes-fr': 'fr',
	'hymnes-en': 'en',
};

const toUniqueSongIds = (songIds: string[]) =>
	Array.from(new Set(songIds.filter((songId) => typeof songId === 'string' && songId.trim().length > 0)));

const buildCrossLanguageIndex = () => {
	const index: Record<string, string[]> = {};

	Object.entries(RAW_CROSS_LANGUAGE_MAP).forEach(([sourceSongId, links]) => {
		const groupSongIds = toUniqueSongIds([
			sourceSongId,
			links.rw || '',
			links.fr || '',
			links.en || '',
		]);

		groupSongIds.forEach((songId) => {
			const peerSongIds = groupSongIds.filter((peerSongId) => peerSongId !== songId);
			index[songId] = toUniqueSongIds([...(index[songId] || []), ...peerSongIds]);
		});
	});

	return index;
};

const CROSS_LANGUAGE_INDEX = buildCrossLanguageIndex();

export const getCrossLanguageSongIds = (songId: string): string[] =>
	CROSS_LANGUAGE_INDEX[songId] || [];

export const getLanguageCodeFromSongId = (songId: string): LanguageCode => {
	const collectionId = songId.split(':')[0];
	return COLLECTION_LANGUAGE_BY_ID[collectionId] || 'multi';
};

export const getRawCrossLanguageMap = () => RAW_CROSS_LANGUAGE_MAP;
