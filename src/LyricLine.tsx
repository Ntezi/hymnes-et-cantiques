import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const REPEAT_MARKER_SPLIT_REGEX = /(\((?:bis|ter|x\d+)\)|\bbis\b|\bter\b|\bx\d+\b|R:\/?)/gi;
const REPEAT_MARKER_REGEX = /^(\((?:bis|ter|x\d+)\)|bis|ter|x\d+|R:\/?)$/i;
const VERSE_NUMBER_REGEX = /^(\d+)\.\s*(.*)$/;
const WHITESPACE_SEGMENT_REGEX = /^\s+$/;

export interface LyricFontStyles {
	line: { lineHeight: number };
	text: { fontSize: number; lineHeight: number };
	number: { fontSize: number };
	instructions: { fontSize: number };
}

interface LyricLineProps {
	line: string;
	lineKey: string;
	// Word state: -1 nothing sung; k = words before k sung and word k current; huge = whole line sung.
	progress: number;
	// Current syllable inside word `progress`: before charStart sung, [charStart, charEnd) current.
	charStart: number;
	charEnd: number;
	fontStyles: LyricFontStyles;
	onLineLayout: (lineKey: string, y: number, height: number) => void;
}

// Colouring follows the text colour only (no background): sung = accent, current syllable =
// accent + underline, upcoming = normal. Word k is the k-th whitespace-separated
// word after the verse number, which is how lyricTiming.json indexes words.
const LyricLine = ({ line, lineKey, progress, charStart, charEnd, fontStyles, onLineLayout }: LyricLineProps) => {
	const verseNumberMatch = line.match(VERSE_NUMBER_REGEX);
	const verseNumber = verseNumberMatch?.[1];
	const content = verseNumberMatch ? verseNumberMatch[2] : line;

	let wordIndex = -1;
	const words = content
		.split(/(\s+)/)
		.filter(token => token.length > 0)
		.map((token, tokenIndex) => {
			if (WHITESPACE_SEGMENT_REGEX.test(token)) {
				return <Text key={tokenIndex}>{token}</Text>;
			}

			wordIndex += 1;
			// [text, style] pieces: a word before the current one is all sung, the current word
			// splits into sung / current syllable / upcoming, later words are plain.
			let pieces: Array<[string, typeof styles.sungWord | null]>;
			if (wordIndex < progress) {
				pieces = [[token, styles.sungWord]];
			} else if (wordIndex === progress) {
				const start = Math.min(charStart, token.length);
				const end = Math.min(Math.max(charEnd, start), token.length);
				pieces = [
					[token.slice(0, start), styles.sungWord],
					[token.slice(start, end), styles.currentWord],
					[token.slice(end), null],
				];
			} else {
				pieces = [[token, null]];
			}

			return (
				<Text key={tokenIndex} style={[styles.verseText, fontStyles.text]}>
					{pieces
						.filter(([text]) => text.length > 0)
						.map(([text, pieceStyle], pieceIndex) => (
							<Text key={pieceIndex} style={pieceStyle}>
								{text
									.split(REPEAT_MARKER_SPLIT_REGEX)
									.filter(segment => segment.length > 0)
									.map((segment, segmentIndex) =>
										REPEAT_MARKER_REGEX.test(segment) ? (
											<Text key={segmentIndex} style={[styles.singingInstructions, fontStyles.instructions]}>
												{segment}
											</Text>
										) : (
											segment
										)
									)}
							</Text>
						))}
				</Text>
			);
		});

	return (
		<View
			onLayout={(event) => {
				const { y, height } = event.nativeEvent.layout;
				onLineLayout(lineKey, y, height);
			}}
			style={styles.verseLineWrap}
		>
			<Text style={[styles.verseLine, fontStyles.line]}>
				{verseNumber ? (
					<Text style={[styles.verseNumber, fontStyles.number]}>{verseNumber}.</Text>
				) : null}
				{verseNumber && content.length > 0 ? ' ' : null}
				{words}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	verseLine: {
		marginBottom: 0,
		lineHeight: 27,
	},
	verseLineWrap: {
		marginBottom: 5,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 1,
	},
	verseText: {
		fontSize: 17,
		color: '#333333',
		fontFamily: 'serif',
		lineHeight: 27,
	},
	sungWord: {
		color: '#6d3549',
	},
	// Underline, not bold: bold changes glyph widths and would reflow the line on every syllable.
	currentWord: {
		color: '#6d3549',
		textDecorationLine: 'underline',
	},
	verseNumber: {
		fontSize: 17,
		fontWeight: '700',
		color: '#6d3549',
	},
	singingInstructions: {
		fontSize: 15,
		fontWeight: '700',
		fontStyle: 'italic',
		color: '#6d3549',
		backgroundColor: '#fce6ee',
	},
});

export default React.memo(LyricLine);
