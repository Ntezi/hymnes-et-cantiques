import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
	NativeScrollEvent,
	NativeSyntheticEvent,
} from 'react-native';
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
import LyricLine from './LyricLine';
import { getSongMelodyMetadata } from './melodyMetadata';
import { getTextNote } from './textNotes';
import {
	buildLineKey,
	findActiveEventIndex,
	getHymnTiming,
	getLineProgress,
	LINE_UPCOMING_PROGRESS,
} from './lyricTiming';
import {
	audioService,
	FOLLOW_ALONG_POLL_INTERVAL_MS,
	PLAYBACK_POLL_INTERVAL_MS,
} from './services/audioService';
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
	clampLyricSyncOffset,
	getCachedLyricsFontStep,
	LYRICS_FONT_SIZES,
	loadLyricsFontStep,
	loadLyricSyncOffset,
	saveLyricsFontStep,
	saveLyricSyncOffset,
} from './settings';
import { HE_C_AUDIO } from '../audio';

const SHOW_MELODY_PLAYBACK = true;
// Follow-along only for the Kinyarwanda hymnal: the piano audio and lyricTiming.json come from it.
const FOLLOW_ALONG_COLLECTION_ID = 'hymnes-rw';
// Auto-scroll stays off this long after the user scrolls by hand.
const MANUAL_SCROLL_HOLD_MS = 4000;
const AUTO_SCROLL_TOP_MARGIN = 60;
const AUTO_SCROLL_BOTTOM_MARGIN = 120;
const AUTO_SCROLL_TARGET_OFFSET = 180;
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MIN_VELOCITY = 500;
// Swipes that start this close to the left edge are left to the system back gesture (iOS).
const SWIPE_LEFT_EDGE_GUARD = 24;

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
	const [fontStep, setFontStep] = useState(getCachedLyricsFontStep());
	const audioOwnerId = useRef(`song-detail-${Math.random().toString(36).slice(2)}`).current;
	const isMelodyLoadedRef = useRef(false);
	const playbackEpochRef = useRef(0);
	const playerPanRef = useRef<PanGestureHandler>(null);
	const scrollViewRef = useRef<ScrollView | null>(null);
	const lineLayoutRef = useRef<Record<string, { y: number; height: number }>>({});
	const cardYRef = useRef<Record<number, number>>({});
	const versesWrapYRef = useRef(0);
	const scrollYRef = useRef(0);
	const viewportHeightRef = useRef(0);
	const manualScrollAtRef = useRef(0);
	const programmaticScrollUntilRef = useRef(0);
	// Last audio status position, with the time it arrived, so the position can be interpolated.
	const clockRef = useRef({ positionMs: 0, at: 0, isPlaying: false });
	const lastUiPositionRef = useRef(0);
	const activeEventRef = useRef(-1);
	const karaokeTimingRef = useRef<ReturnType<typeof getHymnTiming>>(null);
	const syncOffsetRef = useRef(0);
	const [followAlong, setFollowAlong] = useState(true);
	const [syncOffsetMs, setSyncOffsetMs] = useState(0);
	const [activeEventIndex, setActiveEventIndex] = useState(-1);
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
	const textNote = useMemo(() => getTextNote(collection_id, song_number), [collection_id, song_number]);
	const hymnTiming = useMemo(
		() => (collection_id === FOLLOW_ALONG_COLLECTION_ID && hasMelodySource ? getHymnTiming(song_number) : null),
		[collection_id, song_number, hasMelodySource]
	);
	const karaokeOn = followAlong && hymnTiming !== null;
	const karaokeVisible = karaokeOn && hasPlaybackStarted;
	const activeEvent = karaokeVisible ? hymnTiming?.events[activeEventIndex] : undefined;
	const activeLineKey = activeEvent ? buildLineKey(activeEvent[0], activeEvent[1]) : null;
	karaokeTimingRef.current = karaokeVisible ? hymnTiming : null;
	syncOffsetRef.current = syncOffsetMs;
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
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en' || languageCode === 'ee') {
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
			const loadedCategories = await loadFavoriteCategories();
			setFavoriteCategories(loadedCategories);
			await addRecentSongId(song_id);
		})();
	}, [navigation, song_number, title, song_id]);

	// Links can change on a hymn pushed on top of this one (or by Reset), so reload them on
	// every focus; otherwise Save here would write back stale links.
	const refreshMelodyLinks = async () => {
		const [melodyLinkMap, hasOverrides] = await Promise.all([
			loadMelodyLinkMap(),
			hasUserMelodyOverrides(),
		]);
		setHasMelodyOverrides(hasOverrides);
		setSameMelodySongIdsState(getSameMelodySongIds(song_id, melodyLinkMap));
	};

	useEffect(() => {
		refreshMelodyLinks();
		return navigation.addListener('focus', refreshMelodyLinks);
	}, [navigation, song_id]);

	// Audio is not loaded when the hymn opens. It loads on the first Play (see loadAndPlayMelody)
	// and is released when the hymn changes, the screen loses focus or unmounts.
	const resetPlaybackState = () => {
		playbackEpochRef.current += 1;
		isMelodyLoadedRef.current = false;
		clockRef.current = { positionMs: 0, at: 0, isPlaying: false };
		lastUiPositionRef.current = 0;
		activeEventRef.current = -1;
		setActiveEventIndex(-1);
		setPlaybackPositionMs(0);
		setPlaybackDurationMs(0);
		setIsPlaying(false);
		setIsBuffering(false);
		setIsMelodyLoading(false);
		setHasPlaybackStarted(false);
		setMelodyError(null);
	};

	useEffect(() => {
		lineLayoutRef.current = {};
		cardYRef.current = {};
		manualScrollAtRef.current = 0;
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

	// Keep the screen on while a hymn is open (people read along during worship), not app-wide.
	useEffect(() => {
		activateKeepAwake(audioOwnerId).catch(() => undefined);
		return () => {
			deactivateKeepAwake(audioOwnerId).catch(() => undefined);
		};
	}, [audioOwnerId]);

	// Position used for the colouring: last status position, advanced by the time since it arrived
	// while playing, minus the user's sync nudge. Only re-renders when the active word changes.
	const updateActiveEvent = () => {
		const timing = karaokeTimingRef.current;
		let next = -1;
		if (timing) {
			const clock = clockRef.current;
			const positionMs =
				clock.positionMs + (clock.isPlaying ? Date.now() - clock.at : 0) - syncOffsetRef.current;
			next = findActiveEventIndex(timing.events, positionMs);
		}
		if (next !== activeEventRef.current) {
			activeEventRef.current = next;
			setActiveEventIndex(next);
		}
	};

	useEffect(() => {
		updateActiveEvent();
	}, [karaokeVisible, hymnTiming, syncOffsetMs]);

	useEffect(() => {
		if (!karaokeVisible || !isPlaying) {
			return undefined;
		}
		let frame = requestAnimationFrame(function tick() {
			updateActiveEvent();
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, [karaokeVisible, isPlaying, hymnTiming]);

	useEffect(() => {
		if (isMelodyLoadedRef.current) {
			audioService.setFollowAlongPollingAsync(karaokeOn).catch(() => undefined);
		}
	}, [karaokeOn]);

	useEffect(() => {
		let cancelled = false;
		setSyncOffsetMs(0);
		loadLyricSyncOffset(song_number).then((offset) => {
			if (!cancelled) {
				setSyncOffsetMs(offset);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [song_number]);

	const onNudgeSync = (deltaMs: number) => {
		const next = clampLyricSyncOffset(syncOffsetMs + deltaMs);
		setSyncOffsetMs(next);
		saveLyricSyncOffset(song_number, next);
	};

	useEffect(() => {
		if (!activeLineKey || Date.now() - manualScrollAtRef.current < MANUAL_SCROLL_HOLD_MS) {
			return;
		}

		const layout = lineLayoutRef.current[activeLineKey];
		const cardY = cardYRef.current[Number(activeLineKey.split('-')[0])];
		if (!layout || typeof cardY !== 'number') {
			return;
		}

		const top = versesWrapYRef.current + cardY + layout.y;
		const bottom = top + layout.height;
		const viewTop = scrollYRef.current;
		const viewBottom = viewTop + viewportHeightRef.current;
		if (
			viewportHeightRef.current > 0 &&
			top >= viewTop + AUTO_SCROLL_TOP_MARGIN &&
			bottom <= viewBottom - AUTO_SCROLL_BOTTOM_MARGIN
		) {
			return;
		}

		programmaticScrollUntilRef.current = Date.now() + 500;
		scrollViewRef.current?.scrollTo({
			y: Math.max(0, top - AUTO_SCROLL_TARGET_OFFSET),
			animated: true,
		});
	}, [activeLineKey]);

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const y = event.nativeEvent.contentOffset.y;
		const now = Date.now();
		if (now < programmaticScrollUntilRef.current) {
			// Our own animated scroll is still moving.
			programmaticScrollUntilRef.current = now + 200;
		} else if (y !== scrollYRef.current) {
			manualScrollAtRef.current = now;
		}
		scrollYRef.current = y;
	};

	const onLineLayout = useCallback((lineKey: string, y: number, height: number) => {
		lineLayoutRef.current[lineKey] = { y, height };
	}, []);

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

	// If storage fails the sheet stays open and the lists are re-read, so the UI matches what is stored.
	const saveSameMelodySongs = async (linkedSongIds: string[]) => {
		try {
			await setSameMelodySongIds(song_id, linkedSongIds);
			await refreshMelodyLinks();
			setIsSameMelodySheetVisible(false);
		} catch (err) {
			console.error('Unable to save same-melody links:', err);
			refreshMelodyLinks().catch(() => undefined);
		}
	};

	const resetSameMelodyChanges = async () => {
		try {
			await resetUserMelodyOverrides();
			await refreshMelodyLinks();
			setIsSameMelodySheetVisible(false);
		} catch (err) {
			console.error('Unable to reset same-melody links:', err);
			refreshMelodyLinks().catch(() => undefined);
		}
	};

	const applyPlaybackStatus = (status: AVPlaybackStatusSuccess) => {
		const positionMs = status.positionMillis || 0;
		clockRef.current = { positionMs, at: Date.now(), isPlaying: Boolean(status.isPlaying) };
		// The screen state only needs the slower seek-bar rate; the lyrics read clockRef.
		if (!status.isPlaying || Math.abs(positionMs - lastUiPositionRef.current) >= PLAYBACK_POLL_INTERVAL_MS - 50) {
			lastUiPositionRef.current = positionMs;
			setPlaybackPositionMs(positionMs);
		}
		updateActiveEvent();
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
				},
				karaokeOn ? FOLLOW_ALONG_POLL_INTERVAL_MS : PLAYBACK_POLL_INTERVAL_MS
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
			clockRef.current = { positionMs: 0, at: Date.now(), isPlaying: false };
			lastUiPositionRef.current = 0;
		} catch {
			setMelodyError(t('songDetail.unableToStopPlayback'));
		}
	};

	const onSeekPlayback = async (nextPositionMs: number) => {
		try {
			// Jump the lyrics now instead of waiting for the next status update.
			manualScrollAtRef.current = 0;
			clockRef.current = { ...clockRef.current, positionMs: nextPositionMs, at: Date.now() };
			updateActiveEvent();
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

	// Labels under the action icons only on wide screens; phones show icons only to save vertical space.
	const { width: windowWidth } = useWindowDimensions();
	const showActionLabels = windowWidth >= 600;

	const renderActionChip = ({
		key,
		icon,
		label,
		onPress,
		active = false,
		disabled = false,
		badge,
		textIcon,
	}: {
		key: string;
		icon?: string;
		textIcon?: string;
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
				!showActionLabels && styles.actionChipCompact,
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
				{textIcon ? (
					<Text style={[styles.actionTextIcon, active && styles.actionLabelActive, disabled && styles.actionLabelDisabled]}>{textIcon}</Text>
				) : (
					<Icon
						name={icon || 'ellipse-outline'}
						size={20}
						color={disabled ? '#b3b3b3' : active ? '#ffffff' : '#6d3549'}
					/>
				)}
				{badge ? (
					<View style={[styles.actionBadge, active && styles.actionBadgeActive]}>
						<Text style={[styles.actionBadgeText, active && styles.actionBadgeTextActive]}>{badge}</Text>
					</View>
				) : null}
			</View>
			{showActionLabels ? (
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
			) : null}
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<PanGestureHandler
				enabled={!isAnySheetVisible && songs.length > 1}
				activeOffsetX={[-30, 30]}
				failOffsetY={[-20, 20]}
				waitFor={playerPanRef}
				onHandlerStateChange={onSwipeStateChange}
			>
			<View style={styles.swipeArea}>
				<ScrollView
						ref={scrollViewRef}
						contentContainerStyle={styles.contentContainer}
						scrollEventThrottle={16}
						onScroll={onScroll}
						onScrollBeginDrag={() => {
							manualScrollAtRef.current = Date.now();
						}}
						onLayout={(event) => {
							viewportHeightRef.current = event.nativeEvent.layout.height;
						}}
					>
					<View style={styles.songHeaderCard}>
						<View style={styles.songTitleRow}>
							<View style={styles.songNumberBadge}>
								<Text style={styles.songNumberBadgeText}>{song_number}</Text>
							</View>
							<View style={styles.songTitleText}>
								<Text style={styles.songTitle}>{title}</Text>
								{sub_title ? (
									<Text style={[styles.songSubtitle, styles.songSubtitleItalic]} numberOfLines={1}>
										{sub_title}
									</Text>
								) : null}
							</View>
						</View>
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
							<View style={styles.actionDivider} />
							{renderActionChip({
								key: 'font-smaller',
								textIcon: 'A−',
								label: t('songDetail.fontSmaller'),
								disabled: fontStep === 0,
								onPress: () => changeFontStep(-1),
							})}
							{renderActionChip({
								key: 'font-larger',
								textIcon: 'A+',
								label: t('songDetail.fontLarger'),
								disabled: fontStep === LYRICS_FONT_SIZES.length - 1,
								onPress: () => changeFontStep(1),
							})}
						</View>
					</View>

				{textNote ? (
					<View style={styles.textNoteRow}>
						<Icon name="information-circle-outline" size={14} color="#8a6d3b" />
						<Text style={styles.textNoteText}>{t(`textNotes.${textNote}`)}</Text>
					</View>
				) : null}

				{SHOW_MELODY_PLAYBACK && isMelodyControlVisible ? (
					// Claims horizontal drags that start in the player (seek bar) so they never change the hymn.
					<PanGestureHandler ref={playerPanRef} activeOffsetX={[-10, 10]} failOffsetY={[-10, 10]}>
					<View>
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
						followAlong={hymnTiming ? {
							enabled: followAlong,
							syncOffsetMs,
							onToggle: () => setFollowAlong(prev => !prev),
							onNudge: onNudgeSync,
						} : undefined}
						onRetryLoad={onRetryMelodyLoad}
					/>
					</View>
					</PanGestureHandler>
				) : null}

					<View
						style={styles.versesWrap}
						onLayout={(event) => {
							versesWrapYRef.current = event.nativeEvent.layout.y;
						}}
					>
					{verses.map((verse, index) => {
						const lines = verse.split('\n').map(line => line.trim()).filter(Boolean);
						const isRefrain = lines.some(line => line.includes('R:/'));

						return (
							<View
								key={index}
								style={[styles.verseCard, isRefrain && styles.refrainCard]}
								onLayout={(event) => {
									cardYRef.current[index] = event.nativeEvent.layout.y;
								}}
							>
								{lines.map((line, lineIndex) => {
									const lineKey = buildLineKey(index, lineIndex);
									const lineProgress = hymnTiming && activeEvent
										? getLineProgress(hymnTiming, lineKey, activeEventIndex)
										: LINE_UPCOMING_PROGRESS;
									return (
										<LyricLine
											key={lineKey}
											line={line}
											lineKey={lineKey}
											progress={lineProgress.word}
											charStart={lineProgress.charStart}
											charEnd={lineProgress.charEnd}
											fontStyles={lyricFontStyles}
											onLineLayout={onLineLayout}
										/>
									);
								})}
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
	textNoteRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: 4,
		marginTop: -4,
		marginBottom: 12,
	},
	textNoteText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
		color: '#8a6d3b',
		marginLeft: 6,
	},
	songHeaderCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 10,
		alignItems: 'stretch',
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 4,
		elevation: 2,
	},
	favoriteTagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		marginTop: 8,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		maxWidth: '100%',
	},
	songTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	songTitleText: {
		flex: 1,
		minWidth: 0,
		marginLeft: 12,
	},
	songSubtitleItalic: {
		fontStyle: 'italic',
	},
	actionDivider: {
		width: 1,
		alignSelf: 'stretch',
		marginHorizontal: 3,
		backgroundColor: '#f0e4ea',
	},
	actionChipCompact: {
		minHeight: 44,
		paddingVertical: 0,
		justifyContent: 'center',
	},
	actionTextIcon: {
		fontSize: 16,
		fontWeight: '700',
		color: '#6d3549',
	},
	actionRow: {
		flexDirection: 'row',
		alignSelf: 'stretch',
		marginTop: 10,
		paddingTop: 10,
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
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	songNumberBadgeText: {
		fontSize: 22,
		fontWeight: '700',
		color: '#6d3549',
	},
	songTitle: {
		fontSize: 19,
		fontWeight: '600',
		color: '#1a1a1a',
		lineHeight: 25,
	},
	songSubtitle: {
		fontSize: 13,
		color: '#666666',
		marginTop: 2,
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
