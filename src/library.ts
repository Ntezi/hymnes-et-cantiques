import songsRwData from './songs.json';
import songsFrData from './songs_fr.json';
import songsEnData from './songs_en.json';

export type SongTypeId = 'hymn' | 'praise' | 'worship' | 'chorus' | 'other';
export type LanguageCode = 'rw' | 'ee' | 'en' | 'fr' | 'multi';

interface BaseSong {
	song_number: number;
	title: string;
	sub_title?: string;
	verses: string[];
}

export interface AppSong extends BaseSong {
	song_id: string;
	collection_id: string;
	collection_name: string;
	library_name: string;
	language_code: LanguageCode;
	language_label: string;
	song_type_id: SongTypeId;
	song_type_label: string;
}

export interface CollectionItem {
	id: string;
	name: string;
	library_name: string;
	description: string;
	language_code: LanguageCode;
	language_label: string;
	song_types: SongTypeId[];
	songs: AppSong[];
}

export const SONG_TYPE_LABELS: Record<SongTypeId, string> = {
	hymn: 'Hymn',
	praise: 'Praise',
	worship: 'Worship',
	chorus: 'Chorus',
	other: 'Other',
};

export const DEFAULT_COLLECTION_ID = 'hymnes-rw';
export const ENABLE_COLLECTION_CATALOG = true;
export const ENABLE_COLLECTION_FILTERS = false;

const buildSongId = (collectionId: string, songNumber: number) => `${collectionId}:${songNumber}`;

const buildCollectionSongs = (
	songs: BaseSong[],
	collectionId: string,
	collectionName: string,
	libraryName: string,
	languageCode: LanguageCode,
	languageLabel: string
): AppSong[] => songs.map((song) => ({
	...song,
	song_id: buildSongId(collectionId, song.song_number),
	collection_id: collectionId,
	collection_name: collectionName,
	library_name: libraryName,
	language_code: languageCode,
	language_label: languageLabel,
	song_type_id: 'hymn',
	song_type_label: SONG_TYPE_LABELS.hymn,
}));

const hymnesRwSongs: AppSong[] = buildCollectionSongs(
	songsRwData as BaseSong[],
	'hymnes-rw',
	'Hymnes et Cantiques',
	'Hymnes et Cantiques',
	'rw',
	'Kinyarwanda'
);

const hymnesFrSongs: AppSong[] = buildCollectionSongs(
	songsFrData as BaseSong[],
	'hymnes-fr',
	'Hymnes et Cantiques',
	'Hymnes et Cantiques',
	'fr',
	'French'
);

const hymnesEnSongs: AppSong[] = buildCollectionSongs(
	songsEnData as BaseSong[],
	'hymnes-en',
	'Hymns for the Little Flock',
	'Hymns for the Little Flock',
	'en',
	'English'
);

export const COLLECTION_CATALOG: CollectionItem[] = [
	{
		id: 'hymnes-rw',
		name: 'Hymnes et Cantiques (RW)',
		library_name: 'Hymnes et Cantiques',
		description: 'Kinyarwanda collection',
		language_code: 'rw',
		language_label: 'Kinyarwanda',
		song_types: ['hymn'],
		songs: hymnesRwSongs,
	},
	{
		id: 'hymnes-fr',
		name: 'Hymnes et Cantiques (FR 1991)',
		library_name: 'Hymnes et Cantiques',
		description: 'French edition 1991',
		language_code: 'fr',
		language_label: 'French',
		song_types: ['hymn'],
		songs: hymnesFrSongs,
	},
	{
		id: 'hymnes-en',
		name: 'Little Flock (EN 1881)',
		library_name: 'Hymns for the Little Flock',
		description: 'English Little Flock edition',
		language_code: 'en',
		language_label: 'English',
		song_types: ['hymn'],
		songs: hymnesEnSongs,
	},
];

export const getCollections = (): CollectionItem[] =>
	ENABLE_COLLECTION_CATALOG
		? COLLECTION_CATALOG.filter(collection => collection.songs.length > 0)
		: COLLECTION_CATALOG.filter(collection => collection.id === DEFAULT_COLLECTION_ID);

export const getCollectionById = (collectionId: string): CollectionItem | undefined =>
	getCollections().find(collection => collection.id === collectionId);

export const getAllSongs = (): AppSong[] =>
	getCollections().flatMap(collection => collection.songs);

export const getSongById = (songId: string): AppSong | undefined =>
	getAllSongs().find(song => song.song_id === songId);

export const getLanguageNavOptions = () =>
	getCollections().map(collection => ({
		language_code: collection.language_code,
		language_label: collection.language_label,
		collection_id: collection.id,
	}));

export const getSongTypeOptions = (collectionId: string) => {
	const collection = getCollectionById(collectionId);
	if (!collection) {
		return [];
	}

	return collection.song_types.map(songTypeId => ({
		id: songTypeId,
		label: SONG_TYPE_LABELS[songTypeId],
	}));
};
