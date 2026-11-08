// Holds the active timing event index outside React state, so a new syllable re-renders only
// the lines that show it, not the whole hymn screen.
export interface KaraokeStore {
	get: () => number;
	set: (index: number) => void;
	subscribe: (listener: () => void) => () => void;
}

export const createKaraokeStore = (): KaraokeStore => {
	let index = -1;
	const listeners = new Set<() => void>();
	return {
		get: () => index,
		set: (next) => {
			if (next === index) {
				return;
			}
			index = next;
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};
