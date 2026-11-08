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
