interface StackRouteLike {
	name: string;
	params?: { song_id?: string } | object;
}

// How many screens to pop to reach the SongDetail already showing `songId` below the current
// one. Returns 0 when there is none, so the caller pushes a new screen instead.
export const getPopCountToSong = (
	routes: StackRouteLike[],
	currentIndex: number,
	songId: string
): number => {
	for (let i = currentIndex - 1; i >= 0; i -= 1) {
		const route = routes[i];
		if (route.name === 'SongDetail' && (route.params as { song_id?: string } | undefined)?.song_id === songId) {
			return currentIndex - i;
		}
	}
	return 0;
};
