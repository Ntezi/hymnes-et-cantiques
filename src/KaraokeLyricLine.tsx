import React, { useEffect, useState } from 'react';
import LyricLine, { LyricFontStyles } from './LyricLine';
import { KaraokeStore } from './karaokeStore';
import {
	HymnTiming,
	LineProgress,
	LINE_UPCOMING_PROGRESS,
	getLineProgress,
} from './lyricTiming';

interface KaraokeLyricLineProps {
	line: string;
	lineKey: string;
	timing: HymnTiming | null;
	store: KaraokeStore;
	fontStyles: LyricFontStyles;
	onLineLayout: (lineKey: string, y: number, height: number) => void;
}

const computeProgress = (timing: HymnTiming | null, lineKey: string, index: number): LineProgress =>
	timing && index >= 0 ? getLineProgress(timing, lineKey, index) : LINE_UPCOMING_PROGRESS;

const sameProgress = (a: LineProgress, b: LineProgress) =>
	a.word === b.word && a.charStart === b.charStart && a.charEnd === b.charEnd;

// Subscribes to the store itself; setState bails out while this line's progress is unchanged.
const KaraokeLyricLine = ({ line, lineKey, timing, store, fontStyles, onLineLayout }: KaraokeLyricLineProps) => {
	const [progress, setProgress] = useState(() => computeProgress(timing, lineKey, store.get()));

	useEffect(() => {
		const update = () => {
			const next = computeProgress(timing, lineKey, store.get());
			setProgress((prev) => (sameProgress(prev, next) ? prev : next));
		};
		update();
		return store.subscribe(update);
	}, [timing, lineKey, store]);

	return (
		<LyricLine
			line={line}
			lineKey={lineKey}
			progress={progress.word}
			charStart={progress.charStart}
			charEnd={progress.charEnd}
			fontStyles={fontStyles}
			onLineLayout={onLineLayout}
		/>
	);
};

export default React.memo(KaraokeLyricLine);
