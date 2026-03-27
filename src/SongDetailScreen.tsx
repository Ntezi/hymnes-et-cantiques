import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong, getAllSongs, getCollectionById } from './library';
import { addRecentSongId } from './recentSongs';
import AddToFavoriteSheet from './AddToFavoriteSheet';
import SameMelodySheet from './SameMelodySheet';
import {
	FavoriteCategory,
	getSongFavoriteCategories,
	isSongInAnyFavoriteCategory,
	loadFavoriteCategories,
} from './favoriteCategories';
import {
	getSameMelodySongIds,
	loadMelodyLinkMap,
	setSameMelodySongIds,
} from './melodyLinks';

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
		collection_id,
		collection_name,
		library_name,
		language_code,
		language_label,
		song_type_id,
		song_type_label,
		songs,
	} = route.params as AppSong & { songs: AppSong[] };

	const allSongs = useMemo(() => getAllSongs(), []);
	const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
	const [isFavoriteSheetVisible, setIsFavoriteSheetVisible] = useState(false);
	const [sameMelodySongIds, setSameMelodySongIdsState] = useState<string[]>([]);
	const [isSameMelodySheetVisible, setIsSameMelodySheetVisible] = useState(false);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: `${song_number}. ${title}`,
			headerTitleStyle: {
				fontSize: 16,
				fontWeight: '600',
			},
		});

		(async () => {
			const [loadedCategories, melodyLinkMap] = await Promise.all([
				loadFavoriteCategories(),
				loadMelodyLinkMap(),
			]);
			setFavoriteCategories(loadedCategories);
			setSameMelodySongIdsState(getSameMelodySongIds(song_id, melodyLinkMap));
			await addRecentSongId(song_id);
		})();
	}, [navigation, song_number, title, song_id]);

	const isFavorite = useMemo(
		() => isSongInAnyFavoriteCategory(favoriteCategories, song_id),
		[favoriteCategories, song_id]
	);

	const songCategoryCount = useMemo(
		() => getSongFavoriteCategories(favoriteCategories, song_id).length,
		[favoriteCategories, song_id]
	);

	const sameMelodySongs = useMemo(
		() =>
			sameMelodySongIds
				.map(linkedSongId => allSongs.find(song => song.song_id === linkedSongId))
				.filter((song): song is AppSong => Boolean(song)),
		[sameMelodySongIds, allSongs]
	);

	const currentIndex = songs.findIndex(song => song.song_id === song_id);
	const previousSong = currentIndex > 0 ? songs[currentIndex - 1] : null;
	const nextSong = currentIndex >= 0 && currentIndex < songs.length - 1 ? songs[currentIndex + 1] : null;

	const navigateToSongDetail = (song: AppSong | null, songSequence: AppSong[] = songs) => {
		if (!song) {
			return;
		}

		navigation.replace('SongDetail', {
			...song,
			songs: songSequence,
		});
	};

	const saveSameMelodySongs = async (linkedSongIds: string[]) => {
		const updatedLinkMap = await setSameMelodySongIds(song_id, linkedSongIds);
		setSameMelodySongIdsState(getSameMelodySongIds(song_id, updatedLinkMap));
		setIsSameMelodySheetVisible(false);
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
							onPress={() => setIsSameMelodySheetVisible(true)}
							style={styles.melodyHeaderButton}
							activeOpacity={0.85}
						>
							<Icon
								name={sameMelodySongs.length > 0 ? "musical-notes" : "musical-notes-outline"}
								size={19}
								color={sameMelodySongs.length > 0 ? '#6d3549' : '#8f4b5d'}
							/>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setIsFavoriteSheetVisible(true)}
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
						{isFavorite ? (
							<Text style={styles.favoriteSummaryText}>
								In {songCategoryCount} {songCategoryCount === 1 ? 'favorite category' : 'favorite categories'}
							</Text>
						) : (
						<Text style={styles.favoriteSummaryTextMuted}>
							Not in favorites yet
						</Text>
					)}
					{sameMelodySongs.length > 0 ? (
						<Text style={styles.sameMelodySummaryText}>
							Same melody linked: {sameMelodySongs.length}
						</Text>
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

				<View style={styles.sameMelodySection}>
					<View style={styles.sameMelodyHeaderRow}>
						<Icon name="musical-notes-outline" size={16} color="#6d3549" />
						<Text style={styles.sameMelodyTitle}>Same Tone / Melody</Text>
					</View>
					{sameMelodySongs.length === 0 ? (
						<Text style={styles.sameMelodyEmptyText}>
							No linked songs yet. Tap the note icon above to add songs with the same melody.
						</Text>
					) : (
						sameMelodySongs.map((sameMelodySong) => (
							<TouchableOpacity
								key={sameMelodySong.song_id}
								style={styles.sameMelodyCard}
								onPress={() =>
									navigateToSongDetail(
										sameMelodySong,
										getCollectionById(sameMelodySong.collection_id)?.songs || [sameMelodySong]
									)
								}
							>
								<View style={styles.sameMelodyNumberBadge}>
									<Text style={styles.sameMelodyNumberText}>{sameMelodySong.song_number}</Text>
								</View>
								<View style={styles.sameMelodyMeta}>
									<Text style={styles.sameMelodySongTitle} numberOfLines={1}>
										{sameMelodySong.title}
									</Text>
									<Text style={styles.sameMelodySongSubtitle} numberOfLines={1}>
										{sameMelodySong.collection_name} • {sameMelodySong.language_label}
									</Text>
								</View>
								<Icon name="chevron-forward" size={18} color="#b3b3b3" />
							</TouchableOpacity>
						))
					)}
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
			<AddToFavoriteSheet
				visible={isFavoriteSheetVisible}
				songId={song_id}
				onClose={() => setIsFavoriteSheetVisible(false)}
				onUpdated={setFavoriteCategories}
			/>
			<SameMelodySheet
				visible={isSameMelodySheetVisible}
				currentSong={{
					song_id,
					song_number,
					title,
					sub_title,
					verses,
					collection_id,
					collection_name,
					library_name,
					language_code,
					language_label,
					song_type_id,
					song_type_label,
				}}
				allSongs={allSongs}
				selectedSongIds={sameMelodySongIds}
				onClose={() => setIsSameMelodySheetVisible(false)}
				onSave={saveSameMelodySongs}
			/>
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
	melodyHeaderButton: {
		position: 'absolute',
		top: 10,
		left: 10,
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
	favoriteSummaryText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6d3549',
		marginTop: 10,
	},
	favoriteSummaryTextMuted: {
		fontSize: 12,
		fontWeight: '500',
		color: '#999999',
		marginTop: 10,
	},
	sameMelodySummaryText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6d3549',
		marginTop: 4,
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
	sameMelodySection: {
		marginTop: 4,
		marginBottom: 2,
	},
	sameMelodyHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	sameMelodyTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#6d3549',
		marginLeft: 6,
	},
	sameMelodyCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	sameMelodyNumberBadge: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	sameMelodyNumberText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#6d3549',
	},
	sameMelodyMeta: {
		marginLeft: 10,
		flex: 1,
	},
	sameMelodySongTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	sameMelodySongSubtitle: {
		marginTop: 1,
		fontSize: 12,
		color: '#666666',
	},
	sameMelodyEmptyText: {
		fontSize: 12,
		color: '#666666',
		marginBottom: 8,
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
