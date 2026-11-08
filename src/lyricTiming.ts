// Word timing for the "follow along" karaoke view. Data: lyricTiming.json (generated offline).
// Event = [verseIdx, lineIdx, wordIdx, startMs, endMs]; events are sorted by startMs and a word
// can appear more than once (repeated lines).

export type TimingEvent = [number, number, number, number, number];

interface RawHymnTiming {
	quality?: number;
	events: TimingEvent[];
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

// Per-line state passed to the lyric line: -1 = nothing sung yet, k = words before k are sung and
// word k is the current one, LINE_DONE = the whole line is sung.
export const LINE_UPCOMING = -1;
export const LINE_DONE = Number.MAX_SAFE_INTEGER;

export const buildLineKey = (verseIdx: number, lineIdx: number) => `${verseIdx}-${lineIdx}`;

export const buildHymnTiming = (raw: RawHymnTiming): HymnTiming => {
	const events = raw.events;
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
		if (events[mid][3] <= positionMs) {
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
): number => {
	if (activeEventIndex < 0) {
		return LINE_UPCOMING;
	}
	const activeEvent = timing.events[activeEventIndex];
	if (buildLineKey(activeEvent[0], activeEvent[1]) === lineKey) {
		return activeEvent[2];
	}
	const lineEvents = timing.lineEvents[lineKey];
	// A line sung earlier stays coloured; a repeat of it resets when its first word starts again.
	return lineEvents && lineEvents[0] < activeEventIndex ? LINE_DONE : LINE_UPCOMING;
};

let loaded: Record<string, HymnTiming> | null = null;

const loadAll = (): Record<string, HymnTiming> => {
	if (!loaded) {
		const raw = require('./lyricTiming.json') as RawLyricTiming;
		loaded = {};
		Object.keys(raw.hymns).forEach((number) => {
			const hymn = raw.hymns[number];
			if (hymn.events?.length) {
				loaded![number] = buildHymnTiming(hymn);
			}
		});
	}
	return loaded;
};

export const getHymnTiming = (songNumber: number | string): HymnTiming | null => {
	const numeric = Number(songNumber);
	return loadAll()[Number.isFinite(numeric) ? String(numeric) : String(songNumber)] ?? null;
};
