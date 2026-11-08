// Word timing for the "follow along" karaoke view. Data: one file per edition, generated offline:
// lyricTiming.json (rw), lyricTiming_fr.json, lyricTiming_en.json, lyricTiming_ee.json. Word and
// syllable indices are relative to that edition's own songs file.
// Event = [verseIdx, lineIdx, wordIdx, startMs, endMs]; events are sorted by startMs and a word
// can appear more than once (repeated lines).

// Version 2 event: [verseIdx, lineIdx, wordIdx, charStart, charEnd, startMs, endMs], one per sung
// syllable. [charStart, charEnd) is a half-open range inside the word token. Version 1 events,
// [verseIdx, lineIdx, wordIdx, startMs, endMs], are read as whole-word ranges.
// Events are sorted by startMs and a syllable can appear more than once (repeated lines).
export type TimingEvent = [number, number, number, number, number, number, number];
type TimingEventV1 = [number, number, number, number, number];

// charEnd used for a whole word when the token length is not known (version 1).
export const WHOLE_WORD_END = Number.MAX_SAFE_INTEGER;

interface RawHymnTiming {
	quality?: number;
	events: TimingEvent[] | TimingEventV1[];
}

interface RawLyricTiming {
	version: number;
	hymns: Record<string, RawHymnTiming>;
}

export interface HymnTiming {
	quality: number;
	events: TimingEvent[];
	// "verse-line" -> indices into events, ascending.
	lineEvents: Record<string, number[]>;
}

// State of one line: words before `word` are sung; inside word `word`, characters before
// charStart are sung, [charStart, charEnd) is the current syllable and the rest is upcoming.
// word -1 = nothing sung yet, LINE_DONE = the whole line is sung.
export interface LineProgress {
	word: number;
	charStart: number;
	charEnd: number;
}

export const LINE_DONE = Number.MAX_SAFE_INTEGER;
export const LINE_UPCOMING_PROGRESS: LineProgress = { word: -1, charStart: 0, charEnd: 0 };
export const LINE_DONE_PROGRESS: LineProgress = { word: LINE_DONE, charStart: 0, charEnd: 0 };

export const buildLineKey = (verseIdx: number, lineIdx: number) => `${verseIdx}-${lineIdx}`;

export const buildHymnTiming = (raw: RawHymnTiming, version = 2): HymnTiming => {
	const events: TimingEvent[] =
		version === 1
			? (raw.events as TimingEventV1[]).map(
				([verse, line, word, startMs, endMs]): TimingEvent => [verse, line, word, 0, WHOLE_WORD_END, startMs, endMs]
			)
			: (raw.events as TimingEvent[]);
	const lineEvents: Record<string, number[]> = {};
	events.forEach((event, index) => {
		const key = buildLineKey(event[0], event[1]);
		(lineEvents[key] ||= []).push(index);
	});
	return { quality: raw.quality ?? 0, events, lineEvents };
};

// Index of the last event that started at or before positionMs, or -1 before the first one.
// Between phrases the previous word stays current, so a rest simply shows no advance.
export const findActiveEventIndex = (events: TimingEvent[], positionMs: number): number => {
	let low = 0;
	let high = events.length - 1;
	let found = -1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		if (events[mid][5] <= positionMs) {
			found = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return found;
};

export const getLineProgress = (
	timing: HymnTiming,
	lineKey: string,
	activeEventIndex: number
): LineProgress => {
	if (activeEventIndex < 0) {
		return LINE_UPCOMING_PROGRESS;
	}
	const activeEvent = timing.events[activeEventIndex];
	if (buildLineKey(activeEvent[0], activeEvent[1]) === lineKey) {
		return { word: activeEvent[2], charStart: activeEvent[3], charEnd: activeEvent[4] };
	}
	const lineEvents = timing.lineEvents[lineKey];
	// A line sung earlier stays coloured; a repeat of it resets when its first syllable starts again.
	return lineEvents && lineEvents[0] < activeEventIndex ? LINE_DONE_PROGRESS : LINE_UPCOMING_PROGRESS;
};

// Metro needs static require paths, so each edition's file is listed here and read on first use.
const TIMING_SOURCES: Record<string, () => RawLyricTiming> = {
	'hymnes-rw': () => require('./lyricTiming.json'),
	'hymnes-fr': () => require('./lyricTiming_fr.json'),
	'hymnes-en': () => require('./lyricTiming_en.json'),
	'hymnes-ee': () => require('./lyricTiming_ee.json'),
};

type TimingSources = Record<string, () => RawLyricTiming | undefined>;

// Only the requested hymn is indexed (and cached); the edition's file is read once, on first use.
export const createHymnTimingLoader = (sources: TimingSources) => {
	const raws: Record<string, RawLyricTiming | undefined> = {};
	const built: Record<string, Record<string, HymnTiming | null>> = {};

	return (songNumber: number | string, collectionId: string): HymnTiming | null => {
		if (!(collectionId in raws)) {
			raws[collectionId] = sources[collectionId]?.();
			built[collectionId] = {};
		}
		const numeric = Number(songNumber);
		const key = Number.isFinite(numeric) ? String(numeric) : String(songNumber);
		const cache = built[collectionId];
		if (!(key in cache)) {
			const raw = raws[collectionId];
			const hymn = raw?.hymns?.[key];
			cache[key] = hymn?.events?.length ? buildHymnTiming(hymn, raw?.version) : null;
		}
		return cache[key];
	};
};

export const getHymnTiming = createHymnTimingLoader(TIMING_SOURCES);
