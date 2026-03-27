import SongData from './songs.json';

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
export const ENABLE_COLLECTION_CATALOG = false;
export const ENABLE_COLLECTION_FILTERS = false;

const buildSongId = (collectionId: string, songNumber: number) => `${collectionId}:${songNumber}`;

const hymnesRwSongs: AppSong[] = (SongData as BaseSong[]).map((song) => ({
	...song,
	song_id: buildSongId('hymnes-rw', song.song_number),
	collection_id: 'hymnes-rw',
	collection_name: 'Hymnes et Cantiques',
	library_name: 'Hymnes et Cantiques',
	language_code: 'rw',
	language_label: 'Kinyarwanda',
	song_type_id: 'hymn',
	song_type_label: SONG_TYPE_LABELS.hymn,
}));

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
		id: 'hymnes-ewe',
		name: 'Hymnes et Cantiques (EWE)',
		library_name: 'Hymnes et Cantiques',
		description: 'Ewe collection (ready for content)',
		language_code: 'ee',
		language_label: 'Ewe',
		song_types: ['hymn'],
		songs: [],
	},
	{
		id: 'song-library',
		name: 'Other Song Library',
		library_name: 'Other Song Library',
		description: 'Additional non-Hymnes libraries',
		language_code: 'multi',
		language_label: 'Multi-language',
		song_types: ['hymn', 'praise', 'worship', 'chorus', 'other'],
		songs: [],
	},
];

export const getCollections = (): CollectionItem[] =>
	ENABLE_COLLECTION_CATALOG
		? COLLECTION_CATALOG
		: COLLECTION_CATALOG.filter(collection => collection.id === DEFAULT_COLLECTION_ID);

export const getCollectionById = (collectionId: string): CollectionItem | undefined =>
	getCollections().find(collection => collection.id === collectionId);

export const getAllSongs = (): AppSong[] =>
	getCollections().flatMap(collection => collection.songs);

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
