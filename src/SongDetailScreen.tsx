import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import {
	HandlerStateChangeEvent,
	PanGestureHandler,
	PanGestureHandlerEventPayload,
	State,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong, getAllSongs, getCollectionById } from './library';
import { addRecentSongId } from './recentSongs';
import AddToFavoriteSheet from './AddToFavoriteSheet';
import SameMelodySheet from './SameMelodySheet';
import { AVPlaybackStatusSuccess } from 'expo-av';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import MelodyPlayerControl from './MelodyPlayerControl';
import HighlightedText from './HighlightedText';
import { getActiveTimedLine, getActiveTimedLineKey, getSongMelodyMetadata } from './melodyMetadata';
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
	getDefaultSameMelodySongIds,
	getSameMelodySongIds,
	hasUserMelodyOverrides,
	loadMelodyLinkMap,
	resetUserMelodyOverrides,
	setSameMelodySongIds,
} from './melodyLinks';
import { useTranslation } from 'react-i18next';
import {
	clampLyricsFontStep,
	DEFAULT_LYRICS_FONT_STEP,
	LYRICS_FONT_SIZES,
	loadLyricsFontStep,
	saveLyricsFontStep,
} from './settings';
import { HE_C_AUDIO } from '../audio';

const REPEAT_MARKER_SPLIT_REGEX = /(\((?:bis|ter|x\d+)\)|\bbis\b|\bter\b|\bx\d+\b|R:\/?)/gi;
const REPEAT_MARKER_REGEX = /^(\((?:bis|ter|x\d+)\)|bis|ter|x\d+|R:\/?)$/i;
const VERSE_NUMBER_REGEX = /^(\d+)\.\s*(.*)$/;
const WHITESPACE_SEGMENT_REGEX = /^\s+$/;
const SHOW_MELODY_PLAYBACK = true;
const ENABLE_LYRIC_HIGHLIGHTING = false;
const LYRIC_SYNC_LEAD_MS = 0;
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MIN_VELOCITY = 500;
// Swipes that start this close to the left edge are left to the system back gesture (iOS).
const SWIPE_LEFT_EDGE_GUARD = 24;

const tokenizeLyricWords = (text: string): string[] =>
	text
		.split(REPEAT_MARKER_SPLIT_REGEX)
		.filter(segment => segment.length > 0)
		.flatMap((segment) => {
			if (REPEAT_MARKER_REGEX.test(segment.trim())) {
				return [];
			}

			return segment
				.split(/\s+/)
				.map(word => word.trim())
				.filter(Boolean);
		});

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
	const [hasMelodyOverrides, setHasMelodyOverrides] = useState(false);
	const [isSameMelodySheetVisible, setIsSameMelodySheetVisible] = useState(false);
	const [isLanguageSheetVisible, setIsLanguageSheetVisible] = useState(false);
	const [isMelodyControlVisible, setIsMelodyControlVisible] = useState(false);
	const [isMelodyLoading, setIsMelodyLoading] = useState(false);
	const [melodyError, setMelodyError] = useState<string | null>(null);
	const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
	const [playbackDurationMs, setPlaybackDurationMs] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isBuffering, setIsBuffering] = useState(false);
	const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
	const [fontStep, setFontStep] = useState(DEFAULT_LYRICS_FONT_STEP);
	const audioOwnerId = useRef(`song-detail-${Math.random().toString(36).slice(2)}`).current;
	const isMelodyLoadedRef = useRef(false);
	const playbackEpochRef = useRef(0);
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
	const hasMelodySource = Boolean(localAsset);
	const shouldHighlightLyrics =
		ENABLE_LYRIC_HIGHLIGHTING && hasPlaybackStarted && (isPlaying || playbackPositionMs > 0);
	const lyricSyncPositionMs = useMemo(
		() => Math.max(0, playbackPositionMs + LYRIC_SYNC_LEAD_MS),
		[playbackPositionMs]
	);
	const activeLineKey = useMemo(
		() => (
			SHOW_MELODY_PLAYBACK && shouldHighlightLyrics
				? getActiveTimedLineKey(song_id, lyricSyncPositionMs)
				: null
		),
		[song_id, lyricSyncPositionMs, shouldHighlightLyrics]
	);
	const activeTimedLine = useMemo(
		() => (
			SHOW_MELODY_PLAYBACK && shouldHighlightLyrics
				? getActiveTimedLine(song_id, lyricSyncPositionMs)
				: null
		),
		[song_id, lyricSyncPositionMs, shouldHighlightLyrics]
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
	const lyricsFontSize = LYRICS_FONT_SIZES[fontStep];
	const lyricFontStyles = useMemo(
		() => ({
			line: { lineHeight: Math.round(lyricsFontSize * 1.6) },
			text: { fontSize: lyricsFontSize, lineHeight: Math.round(lyricsFontSize * 1.6) },
			number: { fontSize: lyricsFontSize },
			instructions: { fontSize: Math.max(12, lyricsFontSize - 2) },
		}),
		[lyricsFontSize]
	);
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	useEffect(() => {
		loadLyricsFontStep().then(setFontStep);
	}, []);

	const changeFontStep = (delta: number) => {
		const nextStep = clampLyricsFontStep(fontStep + delta);
		if (nextStep === fontStep) {
			return;
		}
		setFontStep(nextStep);
		saveLyricsFontStep(nextStep);
	};

	useEffect(() => {
		navigation.setOptions({
			headerTitle: `${song_number}. ${title}`,
			headerTitleStyle: {
				fontSize: 16,
				fontWeight: '600',
			},
		});

		(async () => {
			const [loadedCategories, melodyLinkMap, hasOverrides] = await Promise.all([
				loadFavoriteCategories(),
				loadMelodyLinkMap(),
				hasUserMelodyOverrides(),
			]);
			setFavoriteCategories(loadedCategories);
			setHasMelodyOverrides(hasOverrides);
			setSameMelodySongIdsState(getSameMelodySongIds(song_id, melodyLinkMap));
			await addRecentSongId(song_id);
		})();
	}, [navigation, song_number, title, song_id]);

	// Audio is not loaded when the hymn opens. It loads on the first Play (see loadAndPlayMelody)
	// and is released when the hymn changes, the screen loses focus or unmounts.
	const resetPlaybackState = () => {
		playbackEpochRef.current += 1;
		isMelodyLoadedRef.current = false;
		setPlaybackPositionMs(0);
		setPlaybackDurationMs(0);
		setIsPlaying(false);
		setIsBuffering(false);
		setIsMelodyLoading(false);
		setHasPlaybackStarted(false);
		setMelodyError(null);
	};

	useEffect(() => {
		lineOffsetMapRef.current = {};
		lastAutoScrollLineRef.current = null;
		setIsLanguageSheetVisible(false);
		setIsMelodyControlVisible(false);
		resetPlaybackState();

		return () => {
			playbackEpochRef.current += 1;
			audioService.unloadAsync(audioOwnerId);
		};
	}, [song_id, collection_id, audioOwnerId]);

	useEffect(() => {
		// Another hymn can be pushed on top of this one (same melody / translation): release the audio.
		const unsubscribe = navigation.addListener('blur', () => {
			audioService.unloadAsync(audioOwnerId);
			resetPlaybackState();
		});
		return unsubscribe;
	}, [navigation, audioOwnerId]);

	useEffect(() => {
		if (!isPlaying) {
			return;
		}

		activateKeepAwake(audioOwnerId).catch(() => undefined);
		return () => {
			deactivateKeepAwake(audioOwnerId).catch(() => undefined);
		};
	}, [isPlaying, audioOwnerId]);

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

	const songFavoriteCategoryNames = useMemo(
		() => getSongFavoriteCategories(favoriteCategories, song_id)
			.map(category => category.name)
			.join(', '),
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

	// Prev/next replace the screen (they walk the current list). Same-melody and translation
	// links push, so Back returns to the hymn the user came from.
	const navigateToSongDetail = (
		song: AppSong | null,
		songSequence: AppSong[] = songs,
		mode: 'replace' | 'push' = 'replace'
	) => {
		if (!song) {
			return;
		}

		navigation[mode]('SongDetail', {
			...song,
			songs: songSequence,
		});
	};

	const isAnySheetVisible = isFavoriteSheetVisible || isSameMelodySheetVisible || isLanguageSheetVisible;

	// Swipe left = next hymn, swipe right = previous hymn, in the list the user came from.
	const onSwipeStateChange = (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
		const { state, oldState, translationX, velocityX, x } = event.nativeEvent;
		if (state !== State.END || oldState !== State.ACTIVE) {
			return;
		}
		if (x - translationX < SWIPE_LEFT_EDGE_GUARD) {
			return;
		}

		const isFarEnough = Math.abs(translationX) >= SWIPE_MIN_DISTANCE;
		const isFastEnough = Math.abs(velocityX) >= SWIPE_MIN_VELOCITY && Math.abs(translationX) >= SWIPE_MIN_DISTANCE / 2;
		if (!isFarEnough && !isFastEnough) {
			return;
		}

		navigateToSongDetail(translationX < 0 ? nextSong : previousSong);
	};

	const onSelectCrossLanguageSong = (song: AppSong) => {
		setIsLanguageSheetVisible(false);
		navigateToSongDetail(
			song,
			getCollectionById(song.collection_id)?.songs || [song],
			'push'
		);
	};

	const saveSameMelodySongs = async (linkedSongIds: string[]) => {
		const updatedLinkMap = await setSameMelodySongIds(song_id, linkedSongIds);
		setSameMelodySongIdsState(getSameMelodySongIds(song_id, updatedLinkMap));
		setHasMelodyOverrides(await hasUserMelodyOverrides());
		setIsSameMelodySheetVisible(false);
	};

	const resetSameMelodyChanges = async () => {
		const defaultLinkMap = await resetUserMelodyOverrides();
		setSameMelodySongIdsState(getSameMelodySongIds(song_id, defaultLinkMap));
		setHasMelodyOverrides(false);
		setIsSameMelodySheetVisible(false);
	};

	const applyPlaybackStatus = (status: AVPlaybackStatusSuccess) => {
		setPlaybackPositionMs(status.positionMillis || 0);
		setPlaybackDurationMs(status.durationMillis || 0);
		setIsPlaying(Boolean(status.isPlaying));
		setIsBuffering(Boolean(status.isBuffering));
		if (status.isPlaying || (status.positionMillis || 0) > 0) {
			setHasPlaybackStarted(true);
		}
	};

	const loadAndPlayMelody = async () => {
		if (!localAsset) {
			return;
		}

		const epoch = playbackEpochRef.current;
		setIsMelodyLoading(true);
		try {
			const initialStatus = await audioService.loadAsync(
				localAsset,
				true,
				audioOwnerId,
				(status) => {
					if (epoch === playbackEpochRef.current) {
						applyPlaybackStatus(status);
					}
				}
			);
			if (epoch !== playbackEpochRef.current) {
				return;
			}
			if (initialStatus.isLoaded) {
				isMelodyLoadedRef.current = true;
				setHasPlaybackStarted(true);
				applyPlaybackStatus(initialStatus);
			} else {
				setMelodyError(t('songDetail.unableToLoadMelody'));
			}
		} catch (err) {
			console.error(`Error loading melody for song ${song_number}:`, err);
			if (epoch === playbackEpochRef.current) {
				setMelodyError(t('songDetail.unableToLoadMelody'));
			}
		} finally {
			if (epoch === playbackEpochRef.current) {
				setIsMelodyLoading(false);
			}
		}
	};

	const onTogglePlayPause = async () => {
		if (!hasMelodySource) {
			return;
		}

		try {
			setMelodyError(null);
			if (isPlaying) {
				await audioService.pauseAsync();
			} else if (!isMelodyLoadedRef.current) {
				await loadAndPlayMelody();
			} else {
				setHasPlaybackStarted(true);
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
			setHasPlaybackStarted(false);
			setPlaybackPositionMs(0);
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
		setMelodyError(null);
		isMelodyLoadedRef.current = false;
		loadAndPlayMelody();
	};

	const getActiveWordIndexForLine = (
		lineKey: string,
		lineText: string,
		isActiveLine: boolean
	): number | null => {
		if (!isActiveLine || !activeTimedLine || activeTimedLine.line_key !== lineKey) {
			return null;
		}

		const words = tokenizeLyricWords(lineText);
		if (words.length === 0) {
			return null;
		}

		const lineDurationMs = Math.max(1, activeTimedLine.end_ms - activeTimedLine.start_ms);
		const relativeProgress = Math.max(
			0,
			Math.min(0.9999, (lyricSyncPositionMs - activeTimedLine.start_ms) / lineDurationMs)
		);

		return Math.min(words.length - 1, Math.floor(relativeProgress * words.length));
	};

	const renderPatternAwareText = (
		text: string,
		lineKey: string,
		isActiveLine: boolean,
		activeWordIndex: number | null
	) => {
		let wordCursor = 0;

		return text
			.split(REPEAT_MARKER_SPLIT_REGEX)
			.filter(segment => segment.length > 0)
			.flatMap((segment, segmentIndex) => {
				const isRepeatToken = REPEAT_MARKER_REGEX.test(segment.trim());
				if (isRepeatToken) {
					return [
						<HighlightedText
							key={`${lineKey}-repeat-${segmentIndex}`}
							isActive={isActiveLine}
							style={[styles.singingInstructions, lyricFontStyles.instructions]}
							activeStyle={styles.activeSingingInstructions}
						>
							{segment}
						</HighlightedText>
					];
				}

				return segment
					.split(/(\s+)/)
					.filter(token => token.length > 0)
					.map((token, tokenIndex) => {
						if (WHITESPACE_SEGMENT_REGEX.test(token)) {
							return <Text key={`${lineKey}-space-${segmentIndex}-${tokenIndex}`}>{token}</Text>;
						}

						const currentWordIndex = wordCursor;
						wordCursor += 1;
						const isWordActive = isActiveLine && activeWordIndex === currentWordIndex;
						const isLineFallbackActive = isActiveLine && activeWordIndex === null;

						return (
							<HighlightedText
								key={`${lineKey}-word-${segmentIndex}-${tokenIndex}`}
								isActive={isWordActive || isLineFallbackActive}
								style={[styles.verseText, lyricFontStyles.text]}
								activeStyle={isWordActive ? styles.activeWordText : styles.activeVerseText}
							>
								{token}
							</HighlightedText>
						);
					});
			});
	};

	const renderActionChip = ({
		key,
		icon,
		label,
		onPress,
		active = false,
		disabled = false,
		badge,
	}: {
		key: string;
		icon: string;
		label: string;
		onPress: () => void;
		active?: boolean;
		disabled?: boolean;
		badge?: number;
	}) => (
		<TouchableOpacity
			key={key}
			style={[
				styles.actionChip,
				active && styles.actionChipActive,
				disabled && styles.actionChipDisabled,
			]}
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={badge ? `${label}, ${badge}` : label}
			accessibilityState={{ disabled, selected: active }}
		>
			<View style={styles.actionIconWrap}>
				<Icon
					name={icon}
					size={20}
					color={disabled ? '#b3b3b3' : active ? '#ffffff' : '#6d3549'}
				/>
				{badge ? (
					<View style={[styles.actionBadge, active && styles.actionBadgeActive]}>
						<Text style={[styles.actionBadgeText, active && styles.actionBadgeTextActive]}>{badge}</Text>
					</View>
				) : null}
			</View>
			<Text
				style={[
					styles.actionLabel,
					active && styles.actionLabelActive,
					disabled && styles.actionLabelDisabled,
				]}
				numberOfLines={2}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);

	const renderLine = (line: string, lineKey: string) => {
		const verseNumberMatch = line.match(VERSE_NUMBER_REGEX);
		const verseNumber = verseNumberMatch?.[1];
		const verseBody = verseNumberMatch ? verseNumberMatch[2] : line;
		const content = verseBody;
		const isActiveLine = activeLineKey === lineKey;
		const activeWordIndex = getActiveWordIndexForLine(lineKey, content, isActiveLine);

		return (
			<View
				key={lineKey}
				onLayout={(event) => {
					lineOffsetMapRef.current[lineKey] = event.nativeEvent.layout.y;
				}}
				style={[styles.verseLineWrap, isActiveLine && styles.activeVerseLineWrap]}
			>
				<Text style={[styles.verseLine, lyricFontStyles.line]}>
					{verseNumber ? (
						<HighlightedText
							style={[styles.verseNumber, lyricFontStyles.number]}
							activeStyle={styles.activeVerseNumber}
							isActive={isActiveLine}
						>
							{verseNumber}.
						</HighlightedText>
					) : null}
					{verseNumber && content.length > 0 ? ' ' : null}
					{renderPatternAwareText(content, lineKey, isActiveLine, activeWordIndex)}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<PanGestureHandler
				enabled={!isAnySheetVisible && songs.length > 1}
				activeOffsetX={[-30, 30]}
				failOffsetY={[-20, 20]}
				onHandlerStateChange={onSwipeStateChange}
			>
			<View style={styles.swipeArea}>
				<ScrollView ref={scrollViewRef} contentContainerStyle={styles.contentContainer}>
					{currentIndex >= 0 && songs.length > 1 ? (
						<Text style={styles.positionText}>
							{t('songDetail.positionOf', { current: currentIndex + 1, total: songs.length })}
						</Text>
					) : null}
					<View style={styles.songHeaderCard}>
						<View style={styles.songNumberBadge}>
							<Text style={styles.songNumberBadgeText}>{song_number}</Text>
						</View>
						<Text style={styles.songTitle}>{title}</Text>
						{sub_title ? (
							<Text style={styles.songSubtitle}>{sub_title}</Text>
						) : null}
						{isFavorite && songFavoriteCategoryNames ? (
							<View style={styles.favoriteTagRow}>
								<Icon name="heart" size={12} color="#6d3549" />
								<Text style={styles.favoriteSummaryText} numberOfLines={2}>
									{songFavoriteCategoryNames}
								</Text>
							</View>
						) : null}

						<View style={styles.actionRow}>
							{SHOW_MELODY_PLAYBACK
								? renderActionChip({
									key: 'melody',
									icon: isMelodyControlVisible ? 'volume-high' : 'volume-medium-outline',
									label: t('songDetail.actionMelody'),
									active: isMelodyControlVisible,
									disabled: !hasMelodySource,
									onPress: () => setIsMelodyControlVisible((prev) => !prev),
								})
								: null}
							{renderActionChip({
								key: 'same-melody',
								icon: sameMelodySongs.length > 0 ? 'musical-notes' : 'musical-notes-outline',
								label: t('songDetail.actionSameMelody'),
								badge: sameMelodySongs.length,
								onPress: () => setIsSameMelodySheetVisible(true),
							})}
							{renderActionChip({
								key: 'favorite',
								icon: isFavorite ? 'heart' : 'heart-outline',
								label: t('songDetail.actionFavorite'),
								active: isFavorite,
								onPress: () => setIsFavoriteSheetVisible(true),
							})}
							{renderActionChip({
								key: 'translations',
								icon: crossLanguageSongs.length > 0 ? 'globe' : 'globe-outline',
								label: t('songDetail.actionTranslations'),
								badge: crossLanguageSongs.length,
								disabled: crossLanguageSongs.length === 0,
								onPress: () => setIsLanguageSheetVisible(true),
							})}
						</View>
					</View>

				{SHOW_MELODY_PLAYBACK && isMelodyControlVisible ? (
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

					<View style={styles.fontSizeRow}>
						<Text style={styles.fontSizeLabel}>{t('songDetail.fontSize')}</Text>
						<View style={styles.fontSizeButtons}>
							<TouchableOpacity
								style={[styles.fontSizeButton, fontStep === 0 && styles.fontSizeButtonDisabled]}
								disabled={fontStep === 0}
								onPress={() => changeFontStep(-1)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel={t('songDetail.fontSmaller')}
								accessibilityState={{ disabled: fontStep === 0 }}
							>
								<Text style={[styles.fontSizeButtonText, styles.fontSizeButtonTextSmall, fontStep === 0 && styles.fontSizeButtonTextDisabled]}>A-</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.fontSizeButton, fontStep === LYRICS_FONT_SIZES.length - 1 && styles.fontSizeButtonDisabled]}
								disabled={fontStep === LYRICS_FONT_SIZES.length - 1}
								onPress={() => changeFontStep(1)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel={t('songDetail.fontLarger')}
								accessibilityState={{ disabled: fontStep === LYRICS_FONT_SIZES.length - 1 }}
							>
								<Text style={[styles.fontSizeButtonText, fontStep === LYRICS_FONT_SIZES.length - 1 && styles.fontSizeButtonTextDisabled]}>A+</Text>
							</TouchableOpacity>
						</View>
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
						<View style={styles.sameMelodyTitleWrap}>
							<Icon name="musical-notes-outline" size={16} color="#6d3549" />
							<Text style={styles.sameMelodyTitle}>{t('sameMelody.sectionTitle')}</Text>
						</View>
						<TouchableOpacity
							style={styles.sameMelodyEditButton}
							onPress={() => setIsSameMelodySheetVisible(true)}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel={`${t('common.edit')}: ${t('sameMelody.sectionTitle')}`}
						>
							<Icon name="create-outline" size={14} color="#6d3549" />
							<Text style={styles.sameMelodyEditText}>{t('common.edit')}</Text>
						</TouchableOpacity>
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
								accessibilityRole="button"
								accessibilityLabel={`${sameMelodySong.song_number}. ${sameMelodySong.title}`}
								onPress={() =>
									navigateToSongDetail(
										sameMelodySong,
										getCollectionById(sameMelodySong.collection_id)?.songs || [sameMelodySong],
										'push'
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
										{sameMelodySong.sub_title
											|| `${sameMelodySong.collection_name} • ${resolveLanguageLabel(sameMelodySong.language_code, sameMelodySong.language_label)}`}
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
						accessibilityRole="button"
						accessibilityLabel={t('songDetail.previous')}
						accessibilityState={{ disabled: !previousSong }}
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
						accessibilityRole="button"
						accessibilityLabel={t('songDetail.next')}
						accessibilityState={{ disabled: !nextSong }}
						onPress={() => navigateToSongDetail(nextSong)}
					>
						<Text style={[styles.navButtonText, !nextSong && styles.navButtonTextDisabled]}>
							{t('songDetail.next')}
						</Text>
						<Icon name="chevron-forward" size={16} color={nextSong ? '#6d3549' : '#b3b3b3'} />
					</TouchableOpacity>
				</View>
			</ScrollView>
			</View>
			</PanGestureHandler>
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
				defaultSongIds={getDefaultSameMelodySongIds(song_id)}
				hasUserChanges={hasMelodyOverrides}
				onClose={() => setIsSameMelodySheetVisible(false)}
				onSave={saveSameMelodySongs}
				onReset={resetSameMelodyChanges}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	swipeArea: {
		flex: 1,
	},
	positionText: {
		alignSelf: 'flex-end',
		marginBottom: 6,
		fontSize: 12,
		fontWeight: '600',
		color: '#666666',
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
		paddingTop: 20,
		paddingBottom: 14,
		alignItems: 'center',
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 4,
		elevation: 2,
	},
	favoriteTagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		maxWidth: '100%',
	},
	actionRow: {
		flexDirection: 'row',
		alignSelf: 'stretch',
		marginTop: 16,
		paddingTop: 14,
		borderTopWidth: 1,
		borderTopColor: '#f0e4ea',
	},
	actionChip: {
		flex: 1,
		marginHorizontal: 3,
		paddingVertical: 8,
		paddingHorizontal: 4,
		borderRadius: 12,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	actionChipActive: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	actionChipDisabled: {
		backgroundColor: '#f7f7f7',
		borderColor: '#ececec',
	},
	actionIconWrap: {
		width: 28,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBadge: {
		position: 'absolute',
		top: -6,
		right: -8,
		minWidth: 16,
		height: 16,
		paddingHorizontal: 4,
		borderRadius: 8,
		backgroundColor: '#6d3549',
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBadgeActive: {
		backgroundColor: '#ffffff',
	},
	actionBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#ffffff',
	},
	actionBadgeTextActive: {
		color: '#6d3549',
	},
	actionLabel: {
		marginTop: 4,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
		color: '#6d3549',
		textAlign: 'center',
	},
	actionLabelActive: {
		color: '#ffffff',
	},
	actionLabelDisabled: {
		color: '#b3b3b3',
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
		marginLeft: 5,
		fontSize: 12,
		fontWeight: '600',
		color: '#6d3549',
		flexShrink: 1,
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
	fontSizeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	fontSizeLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#666666',
	},
	fontSizeButtons: {
		flexDirection: 'row',
	},
	fontSizeButton: {
		minWidth: 52,
		height: 44,
		marginLeft: 8,
		borderRadius: 12,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	fontSizeButtonDisabled: {
		backgroundColor: '#f7f7f7',
		borderColor: '#ececec',
	},
	fontSizeButtonText: {
		fontSize: 17,
		fontWeight: '700',
		color: '#6d3549',
	},
	fontSizeButtonTextSmall: {
		fontSize: 14,
	},
	fontSizeButtonTextDisabled: {
		color: '#b3b3b3',
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
		lineHeight: 27,
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
		fontSize: 17,
		color: '#333333',
		fontFamily: 'serif',
		lineHeight: 27,
	},
	activeVerseText: {
		color: '#5f2539',
		fontWeight: '700',
	},
	activeWordText: {
		color: '#4b1b2b',
		fontWeight: '800',
		backgroundColor: '#f6cada',
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
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	sameMelodyTitleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	sameMelodyEditButton: {
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 44,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
	},
	sameMelodyEditText: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '700',
		color: '#6d3549',
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
		minHeight: 44,
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
