import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong } from './library';
import { useTranslation } from 'react-i18next';

interface LanguageSwitchSheetProps {
	visible: boolean;
	currentSong: AppSong;
	linkedSongs: AppSong[];
	onClose: () => void;
	onSelectSong: (song: AppSong) => void;
}

const LanguageSwitchSheet = ({
	visible,
	currentSong,
	linkedSongs,
	onClose,
	onSelectSong,
}: LanguageSwitchSheetProps) => {
	const { t } = useTranslation();
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.backdrop}>
				<TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onClose} />
				<View style={styles.sheet}>
					<View style={styles.headerRow}>
						<View style={styles.titleWrap}>
							<Icon name="globe-outline" size={18} color="#6d3549" />
							<Text style={styles.sheetTitle}>{t('languageSwitch.title')}</Text>
						</View>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					<Text style={styles.currentSongText} numberOfLines={2}>
						{t('languageSwitch.current', {
							number: currentSong.song_number,
							title: currentSong.title,
							language: resolveLanguageLabel(currentSong.language_code, currentSong.language_label),
						})}
					</Text>

					{linkedSongs.length === 0 ? (
						<Text style={styles.emptyText}>{t('languageSwitch.none')}</Text>
					) : (
						linkedSongs.map((song) => (
							<TouchableOpacity
								key={song.song_id}
								style={styles.linkedSongRow}
								onPress={() => onSelectSong(song)}
							>
								<View style={styles.languageBadge}>
									<Text style={styles.languageBadgeText}>{song.language_code.toUpperCase()}</Text>
								</View>
								<View style={styles.linkedSongMeta}>
									<Text style={styles.linkedSongTitle} numberOfLines={1}>
										{song.song_number}. {song.title}
									</Text>
									<Text style={styles.linkedSongSubtitle} numberOfLines={1}>
										{song.collection_name} - {resolveLanguageLabel(song.language_code, song.language_label)}
									</Text>
								</View>
								<Icon name="chevron-forward" size={18} color="#b3b3b3" />
							</TouchableOpacity>
						))
					)}
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	backdropTapArea: {
		flex: 1,
	},
	sheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: 20,
		paddingTop: 14,
		paddingBottom: 24,
		maxHeight: '70%',
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	titleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sheetTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1a1a1a',
		marginLeft: 6,
	},
	closeButton: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	currentSongText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#666666',
		marginBottom: 10,
	},
	emptyText: {
		fontSize: 13,
		color: '#666666',
		paddingVertical: 14,
		textAlign: 'center',
	},
	linkedSongRow: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 11,
		paddingVertical: 10,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	languageBadge: {
		minWidth: 42,
		height: 28,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	languageBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#6d3549',
	},
	linkedSongMeta: {
		flex: 1,
		marginLeft: 10,
	},
	linkedSongTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	linkedSongSubtitle: {
		fontSize: 12,
		color: '#666666',
		marginTop: 1,
	},
});

export default LanguageSwitchSheet;
