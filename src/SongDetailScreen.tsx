import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong, DEFAULT_COLLECTION_ID } from './library';
import { loadFavoriteSongIds, saveFavoriteSongIds } from './favorites';

const REPEAT_MARKER_SPLIT_REGEX = /(\((?:bis|ter|x\d+)\)|\bbis\b|\bter\b|\bx\d+\b|R:\/?)/gi;
const REPEAT_MARKER_REGEX = /^(\((?:bis|ter|x\d+)\)|bis|ter|x\d+|R:\/?)$/i;
const VERSE_NUMBER_REGEX = /^(\d+)\.\s*(.*)$/;

const SongDetailScreen = ({ route, navigation }) => {
	const {
		song_id,
		song_number,
		verses,
		title,
		sub_title,
		collection_name,
		language_label,
		song_type_label,
		songs,
	} = route.params as AppSong & { songs: AppSong[] };

	const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: `${song_number}. ${title}`,
			headerTitleStyle: {
				fontSize: 16,
				fontWeight: '600',
			},
		});

		(async () => {
			const loaded = await loadFavoriteSongIds(DEFAULT_COLLECTION_ID);
			setFavoriteSongIds(loaded);
		})();
	}, [navigation, song_number, title]);

	const isFavorite = useMemo(() => favoriteSongIds.includes(song_id), [favoriteSongIds, song_id]);

	const toggleFavorite = async () => {
		const updated = isFavorite
			? favoriteSongIds.filter(id => id !== song_id)
			: [...favoriteSongIds, song_id];

		setFavoriteSongIds(updated);
		await saveFavoriteSongIds(updated);
	};

	const currentIndex = songs.findIndex(song => song.song_id === song_id);
	const previousSong = currentIndex > 0 ? songs[currentIndex - 1] : null;
	const nextSong = currentIndex >= 0 && currentIndex < songs.length - 1 ? songs[currentIndex + 1] : null;

	const navigateToSongDetail = (song: AppSong | null) => {
		if (!song) {
			return;
		}

		navigation.replace('SongDetail', {
			...song,
			songs,
		});
	};

	const renderPatternAwareText = (text: string, lineKey: string) =>
		text
			.split(REPEAT_MARKER_SPLIT_REGEX)
			.filter(segment => segment.length > 0)
			.map((segment, segmentIndex) => {
				const isRepeatToken = REPEAT_MARKER_REGEX.test(segment.trim());
				return (
					<Text
						key={`${lineKey}-${segmentIndex}`}
						style={isRepeatToken ? styles.singingInstructions : styles.verseText}
					>
						{segment}
					</Text>
				);
			});

	const renderLine = (line: string, lineKey: string) => {
		const verseNumberMatch = line.match(VERSE_NUMBER_REGEX);
		const verseNumber = verseNumberMatch?.[1];
		const verseBody = verseNumberMatch ? verseNumberMatch[2] : line;
		const content = verseNumber ? ` ${verseBody}` : verseBody;

		return (
			<View key={lineKey} style={styles.verseLineWrap}>
				<Text style={styles.verseLine}>
					{verseNumber ? <Text style={styles.verseNumber}>{verseNumber}.</Text> : null}
					{renderPatternAwareText(content, lineKey)}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
				<ScrollView contentContainerStyle={styles.contentContainer}>
					<View style={styles.songHeaderCard}>
						<TouchableOpacity
							onPress={toggleFavorite}
							style={styles.favoriteHeaderButton}
							activeOpacity={0.85}
						>
							<Icon
								name={isFavorite ? "heart" : "heart-outline"}
								size={20}
								color={isFavorite ? '#6d3549' : '#8f4b5d'}
							/>
						</TouchableOpacity>

						<View style={styles.songNumberBadge}>
							<Text style={styles.songNumberBadgeText}>{song_number}</Text>
						</View>
					<Text style={styles.songTitle}>{title}</Text>
					{sub_title ? (
						<Text style={styles.songSubtitle}>{sub_title}</Text>
					) : null}

					{/* <View style={styles.metadataRow}>
						<View style={styles.metadataChip}>
							<Text style={styles.metadataChipText}>{collection_name}</Text>
						</View>
						<View style={styles.metadataChip}>
							<Text style={styles.metadataChipText}>{language_label}</Text>
						</View>
						<View style={styles.metadataChip}>
							<Text style={styles.metadataChipText}>{song_type_label}</Text>
						</View>
					</View> */}
				</View>

				<View style={styles.versesWrap}>
					{verses.map((verse, index) => {
						const lines = verse.split('\n').map(line => line.trim()).filter(Boolean);
						const isRefrain = lines.some(line => line.includes('R:/'));

						return (
							<View key={index} style={[styles.verseCard, isRefrain && styles.refrainCard]}>
								{lines.map((line, lineIndex) => renderLine(line, `${index}-${lineIndex}`))}
							</View>
						);
						})}
					</View>

					<View style={styles.songNavRow}>
					<TouchableOpacity
						style={[styles.navButton, !previousSong && styles.navButtonDisabled]}
						disabled={!previousSong}
						onPress={() => navigateToSongDetail(previousSong)}
					>
						<Icon name="chevron-back" size={16} color={previousSong ? '#6d3549' : '#b3b3b3'} />
						<Text style={[styles.navButtonText, !previousSong && styles.navButtonTextDisabled]}>Previous</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.navButton, !nextSong && styles.navButtonDisabled]}
						disabled={!nextSong}
						onPress={() => navigateToSongDetail(nextSong)}
					>
						<Text style={[styles.navButtonText, !nextSong && styles.navButtonTextDisabled]}>Next</Text>
						<Icon name="chevron-forward" size={16} color={nextSong ? '#6d3549' : '#b3b3b3'} />
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	contentContainer: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		paddingBottom: 28,
	},
	songHeaderCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 20,
		alignItems: 'center',
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 4,
		elevation: 2,
	},
	favoriteHeaderButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	songNumberBadge: {
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	songNumberBadgeText: {
		fontSize: 22,
		fontWeight: '700',
		color: '#6d3549',
	},
	songTitle: {
		fontSize: 22,
		fontWeight: '600',
		color: '#1a1a1a',
		textAlign: 'center',
		lineHeight: 30,
	},
	songSubtitle: {
		fontSize: 14,
		fontStyle: 'italic',
		color: '#666666',
		marginTop: 6,
		textAlign: 'center',
	},
	metadataRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginTop: 10,
	},
	metadataChip: {
		backgroundColor: '#f5f5f5',
		borderRadius: 999,
		paddingVertical: 5,
		paddingHorizontal: 10,
		marginHorizontal: 4,
		marginVertical: 3,
	},
	metadataChipText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#666666',
	},
	versesWrap: {
		marginTop: 2,
	},
	verseCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#ececec',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
	},
	refrainCard: {
		backgroundColor: '#fdf8fb',
		borderColor: '#f5e0e9',
	},
	verseLine: {
		marginBottom: 0,
		lineHeight: 29,
	},
	verseLineWrap: {
		marginBottom: 5,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 1,
	},
	verseText: {
		fontSize: 18,
		color: '#333333',
		fontFamily: 'serif',
		lineHeight: 29,
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
	songNavRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
	},
	navButton: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		minWidth: 122,
		justifyContent: 'center',
	},
	navButtonDisabled: {
		backgroundColor: '#f5f5f5',
		borderColor: '#ebebeb',
	},
	navButtonText: {
		color: '#6d3549',
		fontSize: 14,
		fontWeight: '600',
		marginHorizontal: 4,
	},
	navButtonTextDisabled: {
		color: '#b3b3b3',
	},
});

export default SongDetailScreen;
