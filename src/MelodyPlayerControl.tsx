import React, { useMemo, useState } from 'react';
import {
	GestureResponderEvent,
	LayoutChangeEvent,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

interface MelodyPlayerControlProps {
	isReady: boolean;
	isLoading: boolean;
	isPlaying: boolean;
	isBuffering: boolean;
	positionMs: number;
	durationMs: number;
	errorMessage: string | null;
	sourceLabel?: string;
	onTogglePlayPause: () => void;
	onStop: () => void;
	onSeek: (positionMs: number) => void;
	onRetryLoad: () => void;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const formatDuration = (valueMs: number) => {
	const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const MelodyPlayerControl = ({
	isReady,
	isLoading,
	isPlaying,
	isBuffering,
	positionMs,
	durationMs,
	errorMessage,
	sourceLabel,
	onTogglePlayPause,
	onStop,
	onSeek,
	onRetryLoad,
}: MelodyPlayerControlProps) => {
	const { t } = useTranslation();
	const [seekTrackWidth, setSeekTrackWidth] = useState(0);

	const progressRatio = useMemo(() => {
		if (durationMs <= 0) {
			return 0;
		}

		return clamp(positionMs / durationMs);
	}, [positionMs, durationMs]);

	const onTrackLayout = (event: LayoutChangeEvent) => {
		setSeekTrackWidth(event.nativeEvent.layout.width);
	};

	const onTrackPress = (event: GestureResponderEvent) => {
		if (!isReady || durationMs <= 0 || seekTrackWidth <= 0) {
			return;
		}

		const nextRatio = clamp(event.nativeEvent.locationX / seekTrackWidth);
		onSeek(Math.floor(nextRatio * durationMs));
	};

	if (!isReady && !isLoading && !errorMessage) {
		return (
			<View style={styles.card}>
				<View style={styles.headerRow}>
					<Icon name="musical-notes-outline" size={16} color="#8f4b5d" />
					<Text style={styles.cardTitle}>{t('melody.title')}</Text>
				</View>
				<Text style={styles.unavailableText}>
					{t('melody.unavailable')}
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.titleWrap}>
					<Icon name="musical-note" size={16} color="#6d3549" />
					<Text style={styles.cardTitle}>{t('melody.title')}</Text>
				</View>
				{isBuffering ? <Text style={styles.bufferingText}>{t('melody.buffering')}</Text> : null}
			</View>

			{sourceLabel ? <Text style={styles.sourceText}>{sourceLabel}</Text> : null}

			{errorMessage ? (
				<View style={styles.errorWrap}>
					<Text style={styles.errorText}>{errorMessage}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={onRetryLoad}>
						<Text style={styles.retryButtonText}>{t('common.retry')}</Text>
					</TouchableOpacity>
				</View>
			) : null}

			<View style={styles.seekMetaRow}>
				<Text style={styles.seekTimeText}>{formatDuration(positionMs)}</Text>
				<Text style={styles.seekTimeText}>{formatDuration(durationMs)}</Text>
			</View>

			<TouchableOpacity
				activeOpacity={0.85}
				onPress={onTrackPress}
				onLayout={onTrackLayout}
				style={styles.seekTrack}
				disabled={!isReady}
			>
				<View style={[styles.seekFill, { width: `${progressRatio * 100}%` }]} />
			</TouchableOpacity>

			<View style={styles.controlsRow}>
				<TouchableOpacity
					style={[styles.iconButton, !isReady && styles.iconButtonDisabled]}
					disabled={!isReady}
					onPress={() => onSeek(Math.max(0, positionMs - 10_000))}
				>
					<Icon name="play-back" size={16} color={isReady ? '#6d3549' : '#b3b3b3'} />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.playButton, (!isReady || isLoading) && styles.playButtonDisabled]}
					disabled={!isReady || isLoading}
					onPress={onTogglePlayPause}
				>
					<Icon
						name={isPlaying ? 'pause' : 'play'}
						size={18}
						color={isReady ? '#ffffff' : '#f2dce5'}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.iconButton, !isReady && styles.iconButtonDisabled]}
					disabled={!isReady}
					onPress={() => onSeek(Math.min(durationMs || positionMs + 10_000, positionMs + 10_000))}
				>
					<Icon name="play-forward" size={16} color={isReady ? '#6d3549' : '#b3b3b3'} />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.stopButton, !isReady && styles.iconButtonDisabled]}
					disabled={!isReady}
					onPress={onStop}
				>
					<Text style={[styles.stopText, !isReady && styles.stopTextDisabled]}>{t('melody.stop')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	cardTitle: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '700',
		color: '#6d3549',
	},
	sourceText: {
		marginTop: 4,
		fontSize: 12,
		color: '#666666',
	},
	bufferingText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#a06a7b',
	},
	unavailableText: {
		marginTop: 8,
		fontSize: 12,
		color: '#666666',
	},
	errorWrap: {
		marginTop: 8,
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#fff0f4',
		borderWidth: 1,
		borderColor: '#f3c6d5',
	},
	errorText: {
		fontSize: 12,
		color: '#8a314c',
	},
	retryButton: {
		marginTop: 8,
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#6d3549',
	},
	retryButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#ffffff',
	},
	seekMetaRow: {
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	seekTimeText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#7a7a7a',
	},
	seekTrack: {
		marginTop: 6,
		height: 8,
		borderRadius: 999,
		backgroundColor: '#f0d9e2',
		overflow: 'hidden',
	},
	seekFill: {
		height: '100%',
		backgroundColor: '#6d3549',
	},
	controlsRow: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	iconButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconButtonDisabled: {
		backgroundColor: '#f5f5f5',
		borderColor: '#ebebeb',
	},
	playButton: {
		width: 46,
		height: 46,
		borderRadius: 23,
		backgroundColor: '#6d3549',
		alignItems: 'center',
		justifyContent: 'center',
	},
	playButtonDisabled: {
		backgroundColor: '#c792a5',
	},
	stopButton: {
		paddingHorizontal: 11,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#f5d6e1',
		backgroundColor: '#fdf2f6',
	},
	stopText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#6d3549',
	},
	stopTextDisabled: {
		color: '#b3b3b3',
	},
});

export default MelodyPlayerControl;
