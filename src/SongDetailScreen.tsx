import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong, getAllSongs, getCollectionById } from './library';
import { addRecentSongId } from './recentSongs';
import AddToFavoriteSheet from './AddToFavoriteSheet';
import SameMelodySheet from './SameMelodySheet';
import { AVPlaybackStatusSuccess } from 'expo-av';
import MelodyPlayerControl from './MelodyPlayerControl';
import HighlightedText from './HighlightedText';
import { getActiveTimedLineKey, getSongMelodyMetadata } from './melodyMetadata';
import { audioService } from './services/audioService';
import LanguageSwitchSheet from './LanguageSwitchSheet';
import { getCrossLanguageSongIds } from './crossLanguageMap';
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
import { useTranslation } from 'react-i18next';
import { HE_C_AUDIO } from '../audio';

const REPEAT_MARKER_SPLIT_REGEX = /(\((?:bis|ter|x\d+)\)|\bbis\b|\bter\b|\bx\d+\b|R:\/?)/gi;
const REPEAT_MARKER_REGEX = /^(\((?:bis|ter|x\d+)\)|bis|ter|x\d+|R:\/?)$/i;
const VERSE_NUMBER_REGEX = /^(\d+)\.\s*(.*)$/;
const SHOW_MELODY_PLAYBACK = true;

const SongDetailScreen = ({ route, navigation }) => {
	const { t } = useTranslation();
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
	const [isLanguageSheetVisible, setIsLanguageSheetVisible] = useState(false);
	const [melodyReloadKey, setMelodyReloadKey] = useState(0);
	const [isMelodyLoading, setIsMelodyLoading] = useState(false);
	const [melodyError, setMelodyError] = useState<string | null>(null);
	const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
	const [playbackDurationMs, setPlaybackDurationMs] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isBuffering, setIsBuffering] = useState(false);
	const scrollViewRef = useRef<ScrollView | null>(null);
	const lineOffsetMapRef = useRef<Record<string, number>>({});
	const lastAutoScrollLineRef = useRef<string | null>(null);
	const melodyMetadata = useMemo(
		() => (SHOW_MELODY_PLAYBACK ? getSongMelodyMetadata(song_id) : null),
		[song_id]
	);
	const localAsset = useMemo(() => {
		const numericSongNumber = Number(song_number);
		if (Number.isFinite(numericSongNumber)) {
			return HE_C_AUDIO[String(numericSongNumber)] ?? null;
		}
		return HE_C_AUDIO[String(song_number)] ?? null;
	}, [song_number]);
	const melodySourceUri = useMemo(
		() => melodyMetadata?.melody_url?.trim() || null,
		[melodyMetadata?.melody_url]
	);
	const hasMelodySource = Boolean(localAsset || melodySourceUri);
	const activeLineKey = useMemo(
		() => (SHOW_MELODY_PLAYBACK ? getActiveTimedLineKey(song_id, playbackPositionMs) : null),
		[song_id, playbackPositionMs]
	);
	const fallbackDurationMs = useMemo(
		() => melodyMetadata?.timed_lines[melodyMetadata.timed_lines.length - 1]?.end_ms || 0,
		[melodyMetadata]
	);
	const crossLanguageSongIds = useMemo(
		() => getCrossLanguageSongIds(song_id),
		[song_id]
	);
	const crossLanguageSongs = useMemo(
		() =>
			crossLanguageSongIds
				.map(linkedSongId => allSongs.find(song => song.song_id === linkedSongId))
				.filter((song): song is AppSong => Boolean(song)),
		[crossLanguageSongIds, allSongs]
	);
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	useEffect(() => {
		navigation.setOptions({
			headerTitle: `${song_number}. ${title}`,
			headerTitleStyle: {
				fontSize: 16,
				fontWeight: '600',
			},
			headerRight: () => (
				<TouchableOpacity
					onPress={() => setIsLanguageSheetVisible(true)}
					disabled={crossLanguageSongs.length === 0}
					style={styles.languageHeaderButton}
					activeOpacity={0.85}
				>
					<Icon
						name={crossLanguageSongs.length > 0 ? 'globe' : 'globe-outline'}
						size={18}
						color={crossLanguageSongs.length > 0 ? '#ffffff' : '#d9d9d9'}
					/>
				</TouchableOpacity>
			),
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
	}, [navigation, song_number, title, song_id, crossLanguageSongs.length]);

	useEffect(() => {
		if (!SHOW_MELODY_PLAYBACK) {
			setIsMelodyLoading(false);
			setMelodyError(null);
			audioService.setStatusListener(null);
			audioService.unloadAsync();
			return;
		}

		let isDisposed = false;
		lineOffsetMapRef.current = {};
		lastAutoScrollLineRef.current = null;
		setIsLanguageSheetVisible(false);
		setPlaybackPositionMs(0);
		setPlaybackDurationMs(0);
		setIsPlaying(false);
		setIsBuffering(false);
		setMelodyError(null);

		const loadMelody = async () => {
			audioService.setStatusListener((status) => {
				if (isDisposed) {
					return;
				}
				applyPlaybackStatus(status);
			});

			if (!hasMelodySource) {
				setIsMelodyLoading(false);
				await audioService.unloadAsync();
				return;
			}

			setIsMelodyLoading(true);
			try {
				const source = localAsset ?? (melodySourceUri ? { uri: melodySourceUri } : null);
				if (!source) {
					throw new Error('No audio source');
				}

				console.log(`Loading melody for song ${song_number}, source:`, source);
				const initialStatus = await audioService.loadAsync(source as any, false);
				if (!isDisposed && initialStatus.isLoaded) {
					applyPlaybackStatus(initialStatus);
					console.log(`Melody loaded successfully for song ${song_number}`);
				}
				if (!isDisposed && !initialStatus.isLoaded) {
					console.error(`Failed to load melody for song ${song_number}: status not loaded`);
					setMelodyError(t('songDetail.unableToLoadMelody'));
				}
			} catch (err) {
				console.error(`Error loading melody for song ${song_number}:`, err);
				if (!isDisposed) {
					setMelodyError(t('songDetail.unableToLoadMelody'));
				}
			} finally {
				if (!isDisposed) {
					setIsMelodyLoading(false);
				}
			}
		};

		loadMelody();

		return () => {
			isDisposed = true;
			audioService.setStatusListener(null);
			audioService.unloadAsync();
		};
	}, [song_id, song_number, collection_id, hasMelodySource, localAsset, melodySourceUri, melodyReloadKey, t]);

	useEffect(() => {
		if (!activeLineKey || lastAutoScrollLineRef.current === activeLineKey) {
			return;
		}

		const lineY = lineOffsetMapRef.current[activeLineKey];
		if (typeof lineY !== 'number') {
			return;
		}

		lastAutoScrollLineRef.current = activeLineKey;
		scrollViewRef.current?.scrollTo({
			y: Math.max(0, lineY - 180),
			animated: true,
		});
	}, [activeLineKey]);

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
	const effectiveDurationMs = playbackDurationMs || fallbackDurationMs;
	const isMelodyReady = hasMelodySource && !isMelodyLoading && !melodyError;

	const navigateToSongDetail = (song: AppSong | null, songSequence: AppSong[] = songs) => {
		if (!song) {
			return;
		}

		navigation.replace('SongDetail', {
			...song,
			songs: songSequence,
		});
	};

	const onSelectCrossLanguageSong = (song: AppSong) => {
		setIsLanguageSheetVisible(false);
		navigateToSongDetail(
			song,
			getCollectionById(song.collection_id)?.songs || [song]
		);
	};

	const saveSameMelodySongs = async (linkedSongIds: string[]) => {
		const updatedLinkMap = await setSameMelodySongIds(song_id, linkedSongIds);
		setSameMelodySongIdsState(getSameMelodySongIds(song_id, updatedLinkMap));
		setIsSameMelodySheetVisible(false);
	};

	const applyPlaybackStatus = (status: AVPlaybackStatusSuccess) => {
		setPlaybackPositionMs(status.positionMillis || 0);
		setPlaybackDurationMs(status.durationMillis || 0);
		setIsPlaying(Boolean(status.isPlaying));
		setIsBuffering(Boolean(status.isBuffering));
	};

	const onTogglePlayPause = async () => {
		if (!hasMelodySource) {
			console.log("onTogglePlayPause: No melody metadata or local asset");
			return;
		}

		try {
			setMelodyError(null);
			if (isPlaying) {
				console.log("onTogglePlayPause: Pausing");
				await audioService.pauseAsync();
			} else {
				console.log("onTogglePlayPause: Playing");
				await audioService.playAsync();
			}
		} catch (err) {
			console.error("onTogglePlayPause: Error", err);
			setMelodyError(t('songDetail.unableToChangePlayback'));
		}
	};

	const onStopPlayback = async () => {
		try {
			await audioService.stopAsync();
		} catch {
			setMelodyError(t('songDetail.unableToStopPlayback'));
		}
	};

	const onSeekPlayback = async (nextPositionMs: number) => {
		try {
			await audioService.seekToAsync(nextPositionMs);
		} catch {
			setMelodyError(t('songDetail.unableToSeek'));
		}
	};

	const onRetryMelodyLoad = () => {
		setMelodyReloadKey((prev) => prev + 1);
	};

	const renderPatternAwareText = (text: string, lineKey: string, isActiveLine: boolean) =>
		text
			.split(REPEAT_MARKER_SPLIT_REGEX)
			.filter(segment => segment.length > 0)
			.map((segment, segmentIndex) => {
				const isRepeatToken = REPEAT_MARKER_REGEX.test(segment.trim());
				return (
					<HighlightedText
						key={`${lineKey}-${segmentIndex}`}
						isActive={isActiveLine}
						style={isRepeatToken ? styles.singingInstructions : styles.verseText}
						activeStyle={isRepeatToken ? styles.activeSingingInstructions : styles.activeVerseText}
					>
						{segment}
					</HighlightedText>
				);
			});

	const renderLine = (line: string, lineKey: string) => {
		const verseNumberMatch = line.match(VERSE_NUMBER_REGEX);
		const verseNumber = verseNumberMatch?.[1];
		const verseBody = verseNumberMatch ? verseNumberMatch[2] : line;
		const content = verseNumber ? ` ${verseBody}` : verseBody;
		const isActiveLine = activeLineKey === lineKey;

		return (
			<View
				key={lineKey}
				onLayout={(event) => {
					lineOffsetMapRef.current[lineKey] = event.nativeEvent.layout.y;
				}}
				style={[styles.verseLineWrap, isActiveLine && styles.activeVerseLineWrap]}
			>
				<Text style={styles.verseLine}>
					{verseNumber ? (
						<HighlightedText
							style={styles.verseNumber}
							activeStyle={styles.activeVerseNumber}
							isActive={isActiveLine}
						>
							{verseNumber}.
						</HighlightedText>
					) : null}
					{renderPatternAwareText(content, lineKey, isActiveLine)}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
				<ScrollView ref={scrollViewRef} contentContainerStyle={styles.contentContainer}>
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
								{t('songDetail.inFavoriteCategories', {
									count: songCategoryCount,
									label: t('songDetail.favoriteCategory', { count: songCategoryCount }),
								})}
							</Text>
						) : (
						<Text style={styles.favoriteSummaryTextMuted}>
							{t('songDetail.notInFavorites')}
						</Text>
					)}
					{sameMelodySongs.length > 0 ? (
						<Text style={styles.sameMelodySummaryText}>
							{t('sameMelody.linkedCount', { count: sameMelodySongs.length })}
						</Text>
					) : null}
					{crossLanguageSongs.length > 0 ? (
						<Text style={styles.translationSummaryText}>
							{t('languageSwitch.summary', {
								languages: crossLanguageSongs
									.map(song => resolveLanguageLabel(song.language_code, song.language_label))
									.join(', '),
							})}
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

				{SHOW_MELODY_PLAYBACK ? (
					<MelodyPlayerControl
						isReady={isMelodyReady}
						isLoading={isMelodyLoading}
						isPlaying={isPlaying}
						isBuffering={isBuffering}
						positionMs={playbackPositionMs}
						durationMs={effectiveDurationMs}
						errorMessage={melodyError}
						sourceLabel={localAsset ? "Piano (Cantiquest)" : melodyMetadata?.source_label}
						onTogglePlayPause={onTogglePlayPause}
						onStop={onStopPlayback}
						onSeek={onSeekPlayback}
						onRetryLoad={onRetryMelodyLoad}
					/>
				) : null}

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
						<Text style={styles.sameMelodyTitle}>{t('sameMelody.sectionTitle')}</Text>
					</View>
					{sameMelodySongs.length === 0 ? (
						<Text style={styles.sameMelodyEmptyText}>
							{t('sameMelody.sectionEmpty')}
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
										{sameMelodySong.collection_name} • {resolveLanguageLabel(sameMelodySong.language_code, sameMelodySong.language_label)}
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
						<Text style={[styles.navButtonText, !previousSong && styles.navButtonTextDisabled]}>
							{t('songDetail.previous')}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.navButton, !nextSong && styles.navButtonDisabled]}
						disabled={!nextSong}
						onPress={() => navigateToSongDetail(nextSong)}
					>
						<Text style={[styles.navButtonText, !nextSong && styles.navButtonTextDisabled]}>
							{t('songDetail.next')}
						</Text>
						<Icon name="chevron-forward" size={16} color={nextSong ? '#6d3549' : '#b3b3b3'} />
					</TouchableOpacity>
				</View>
			</ScrollView>
			<LanguageSwitchSheet
				visible={isLanguageSheetVisible}
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
				linkedSongs={crossLanguageSongs}
				onClose={() => setIsLanguageSheetVisible(false)}
				onSelectSong={onSelectCrossLanguageSong}
			/>
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
	languageHeaderButton: {
		marginRight: 10,
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
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
	translationSummaryText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#5f2539',
		marginTop: 4,
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
	activeVerseLineWrap: {
		backgroundColor: '#fdf0f6',
		borderWidth: 1,
		borderColor: '#efc2d2',
	},
	verseText: {
		fontSize: 18,
		color: '#333333',
		fontFamily: 'serif',
		lineHeight: 29,
	},
	activeVerseText: {
		color: '#5f2539',
		fontWeight: '700',
	},
	verseNumber: {
		fontSize: 17,
		fontWeight: '700',
		color: '#6d3549',
	},
	activeVerseNumber: {
		color: '#5f2539',
	},
	singingInstructions: {
		fontSize: 15,
		fontWeight: '700',
		fontStyle: 'italic',
		color: '#6d3549',
		backgroundColor: '#fce6ee',
	},
	activeSingingInstructions: {
		color: '#5f2539',
		backgroundColor: '#f6cada',
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
