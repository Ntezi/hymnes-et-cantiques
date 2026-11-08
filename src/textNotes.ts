// Per-edition notices about a hymn's text (src/textNotes.json: collection id -> hymn number -> kind).
// The kind selects the message: i18n key `textNotes.<kind>`.
export type TextNoteKind = 'missingVerse' | 'versesMixed' | 'checkText';

export const TEXT_NOTE_KINDS: TextNoteKind[] = ['missingVerse', 'versesMixed', 'checkText'];

const RAW_TEXT_NOTES = require('./textNotes.json') as Record<string, Record<string, string>>;

export const getTextNote = (collectionId: string, songNumber: number | string): TextNoteKind | null => {
	const kind = RAW_TEXT_NOTES[collectionId]?.[String(Number(songNumber))];
	return TEXT_NOTE_KINDS.includes(kind as TextNoteKind) ? (kind as TextNoteKind) : null;
};

export const getRawTextNotes = () => RAW_TEXT_NOTES;
