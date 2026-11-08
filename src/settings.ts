import AsyncStorage from '@react-native-async-storage/async-storage';

const LYRICS_FONT_STEP_KEY = 'settings_lyrics_font_step';

// Five lyrics sizes (pt). Step 1 is the size the app used before the control existed.
export const LYRICS_FONT_SIZES = [15, 17, 20, 24, 28];
export const DEFAULT_LYRICS_FONT_STEP = 1;

export const clampLyricsFontStep = (step: number): number =>
	Math.min(LYRICS_FONT_SIZES.length - 1, Math.max(0, Math.round(step)));

// Last known step, so a hymn opens at the saved size on the first render (no size jump).
let cachedStep = DEFAULT_LYRICS_FONT_STEP;
export const getCachedLyricsFontStep = (): number => cachedStep;

export const loadLyricsFontStep = async (): Promise<number> => {
	try {
		const raw = await AsyncStorage.getItem(LYRICS_FONT_STEP_KEY);
		const parsed = raw === null ? NaN : Number(raw);
		cachedStep = Number.isFinite(parsed) ? clampLyricsFontStep(parsed) : DEFAULT_LYRICS_FONT_STEP;
	} catch {
		// Keep the cached value.
	}
	return cachedStep;
};

// Warm the cache at startup (the splash screen runs first).
loadLyricsFontStep();

export const saveLyricsFontStep = async (step: number): Promise<void> => {
	cachedStep = clampLyricsFontStep(step);
	try {
		await AsyncStorage.setItem(LYRICS_FONT_STEP_KEY, String(clampLyricsFontStep(step)));
	} catch {
		// Not persisting is acceptable; the size still applies for this session.
	}
};

// Follow-along timing nudge, per edition and hymn number (ms). Positive = words change colour later.
export const LYRIC_SYNC_STEP_MS = 250;
export const LYRIC_SYNC_MAX_MS = 5000;
const lyricSyncKey = (collectionId: string, songNumber: number | string) =>
	`settings_lyric_sync_ms_${collectionId}_${songNumber}`;
// Before editions had their own timing, only the Kinyarwanda hymnal had a nudge, stored by number alone.
const legacyLyricSyncKey = (songNumber: number | string) => `settings_lyric_sync_ms_${songNumber}`;

export const clampLyricSyncOffset = (offsetMs: number): number =>
	Math.min(LYRIC_SYNC_MAX_MS, Math.max(-LYRIC_SYNC_MAX_MS, Math.round(offsetMs)));

export const loadLyricSyncOffset = async (collectionId: string, songNumber: number | string): Promise<number> => {
	try {
		let raw = await AsyncStorage.getItem(lyricSyncKey(collectionId, songNumber));
		if (raw === null && collectionId === 'hymnes-rw') {
			raw = await AsyncStorage.getItem(legacyLyricSyncKey(songNumber));
		}
		const parsed = raw === null ? NaN : Number(raw);
		return Number.isFinite(parsed) ? clampLyricSyncOffset(parsed) : 0;
	} catch {
		return 0;
	}
};

export const saveLyricSyncOffset = async (collectionId: string, songNumber: number | string, offsetMs: number): Promise<void> => {
	try {
		await AsyncStorage.setItem(lyricSyncKey(collectionId, songNumber), String(clampLyricSyncOffset(offsetMs)));
	} catch {
		// Not persisting is acceptable; the nudge still applies for this session.
	}
};
