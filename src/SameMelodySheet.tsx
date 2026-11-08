import React, { useEffect, useMemo, useState } from 'react';
import {
	FlatList,
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AppSong } from './library';
import { useTranslation } from 'react-i18next';

interface SameMelodySheetProps {
	visible: boolean;
	currentSong: AppSong;
	allSongs: AppSong[];
	selectedSongIds: string[];
	defaultSongIds?: string[];
	hasUserChanges?: boolean;
	onClose: () => void;
	onSave: (songIds: string[]) => void;
	onReset?: () => void;
}

const SameMelodySheet = ({
	visible,
	currentSong,
	allSongs,
	selectedSongIds,
	defaultSongIds = [],
	hasUserChanges = false,
	onClose,
	onSave,
	onReset,
}: SameMelodySheetProps) => {
	const { t } = useTranslation();
	const [search, setSearch] = useState('');
	const [draftSelection, setDraftSelection] = useState<string[]>([]);
	const [isConfirmingReset, setIsConfirmingReset] = useState(false);

	useEffect(() => {
		if (!visible) {
			return;
		}

		setSearch('');
		setIsConfirmingReset(false);
		setDraftSelection(selectedSongIds);
	}, [visible, selectedSongIds]);

	// Links are stored by hymn number and apply to every edition, but the list shows the
	// current edition only.
	const candidateSongs = useMemo(
		() =>
			allSongs
				.filter(song => song.collection_id === currentSong.collection_id && song.song_id !== currentSong.song_id)
				.sort((a, b) => a.song_number - b.song_number),
		[allSongs, currentSong.collection_id, currentSong.song_id]
	);

	const filteredSongs = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		if (!normalizedSearch) {
			// Currently linked songs first so they are visible without scrolling. The order is
			// based on the saved selection, so rows do not jump while the user toggles them.
			return [
				...candidateSongs.filter(song => selectedSongIds.includes(song.song_id)),
				...candidateSongs.filter(song => !selectedSongIds.includes(song.song_id)),
			];
		}

		return candidateSongs.filter(song =>
			song.title.toLowerCase().includes(normalizedSearch)
			|| song.song_number.toString() === normalizedSearch
			|| (song.sub_title || '').toLowerCase().includes(normalizedSearch)
		);
	}, [candidateSongs, selectedSongIds, search]);

	const isSelected = (songId: string) => draftSelection.includes(songId);
	const isConfirmedLink = (songId: string) => defaultSongIds.includes(songId);
	const isUserLink = (songId: string) => isSelected(songId) && !isConfirmedLink(songId);

	const toggleSong = (songId: string) => {
		setDraftSelection((prevSelection) =>
			prevSelection.includes(songId)
				? prevSelection.filter(item => item !== songId)
				: [...prevSelection, songId]
		);
	};

	const renderSongItem = ({ item }: { item: AppSong }) => {
		const selected = isSelected(item.song_id);
		return (
			<TouchableOpacity
				style={[styles.songRow, selected && styles.songRowSelected]}
				onPress={() => toggleSong(item.song_id)}
				activeOpacity={0.8}
				accessibilityRole="checkbox"
				accessibilityLabel={`${item.song_number}. ${item.title}`}
				accessibilityState={{ checked: selected }}
			>
				<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
					{selected ? <Icon name="checkmark" size={14} color="#ffffff" /> : null}
				</View>
				<View style={styles.songNumberBadge}>
					<Text style={styles.songNumberText}>{item.song_number}</Text>
				</View>
				<View style={styles.songRowMeta}>
					<Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
					{item.sub_title ? (
						<Text style={styles.songSubtitle} numberOfLines={1}>{item.sub_title}</Text>
					) : null}
				</View>
				{isConfirmedLink(item.song_id) ? (
					<View style={styles.hymnalTag}>
						<Icon name="checkmark-circle-outline" size={11} color="#6d3549" />
						<Text style={styles.hymnalTagText}>{t('sameMelody.confirmed')}</Text>
					</View>
				) : null}
				{isUserLink(item.song_id) ? (
					<View style={styles.hymnalTag}>
						<Icon name="person-outline" size={11} color="#6d3549" />
						<Text style={styles.hymnalTagText}>{t('sameMelody.yours')}</Text>
					</View>
				) : null}
			</TouchableOpacity>
		);
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
							<Icon name="musical-notes-outline" size={18} color="#6d3549" />
							<Text style={styles.sheetTitle}>{t('sameMelody.title')}</Text>
						</View>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel={t('common.close')}
						>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					<Text style={styles.currentSongText} numberOfLines={2}>
						{t('sameMelody.current', {
							number: currentSong.song_number,
							title: currentSong.title,
						})}
					</Text>
					<Text style={styles.hintText}>{t('sameMelody.hint')}</Text>

					<View style={styles.searchWrap}>
						<Icon name="search-outline" size={17} color="#999999" style={styles.searchIcon} />
						<TextInput
							placeholder={t('sameMelody.searchPlaceholder')}
							placeholderTextColor="#999999"
							value={search}
							onChangeText={setSearch}
							accessibilityLabel={t('sameMelody.searchPlaceholder')}
							style={styles.searchInput}
						/>
					</View>

					<FlatList
						data={filteredSongs}
						renderItem={renderSongItem}
						keyExtractor={(item) => item.song_id}
						style={styles.list}
						contentContainerStyle={styles.listContent}
						keyboardShouldPersistTaps="handled"
						initialNumToRender={12}
						ListEmptyComponent={<Text style={styles.emptyText}>{t('sameMelody.noSongsFound')}</Text>}
					/>

					<View style={styles.footerActions}>
						{hasUserChanges && onReset ? (
							isConfirmingReset ? (
								<View style={styles.resetConfirmBox}>
									<Text style={styles.resetConfirmText}>{t('sameMelody.resetConfirm')}</Text>
									<View style={styles.footerButtons}>
										<TouchableOpacity
											style={[styles.actionButton, styles.cancelButton]}
											onPress={() => setIsConfirmingReset(false)}
											accessibilityRole="button"
										>
											<Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.actionButton, styles.saveButton]}
											onPress={onReset}
											accessibilityRole="button"
										>
											<Text style={styles.saveButtonText}>{t('sameMelody.resetAction')}</Text>
										</TouchableOpacity>
									</View>
								</View>
							) : (
								<TouchableOpacity
									style={styles.resetButton}
									onPress={() => setIsConfirmingReset(true)}
									accessibilityRole="button"
								>
									<Text style={styles.resetButtonText}>{t('sameMelody.reset')}</Text>
								</TouchableOpacity>
							)
						) : null}
						<Text style={styles.selectedCountText}>
							{t('sameMelody.selectedCount', { count: draftSelection.length })}
						</Text>
						<View style={styles.footerButtons}>
							<TouchableOpacity
								style={[styles.actionButton, styles.cancelButton]}
								onPress={onClose}
								accessibilityRole="button"
							>
								<Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.actionButton, styles.saveButton]}
								onPress={() => onSave(draftSelection)}
								accessibilityRole="button"
							>
								<Text style={styles.saveButtonText}>{t('common.save')}</Text>
							</TouchableOpacity>
						</View>
					</View>
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
		maxHeight: '88%',
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
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	currentSongText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#6d3549',
		marginBottom: 4,
	},
	hintText: {
		fontSize: 12,
		color: '#666666',
		lineHeight: 17,
		marginBottom: 10,
	},
	searchWrap: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 3,
		flexDirection: 'row',
		alignItems: 'center',
	},
	searchIcon: {
		marginRight: 6,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1a1a1a',
		paddingVertical: 10,
	},
	list: {
		marginTop: 10,
		maxHeight: 390,
	},
	listContent: {
		paddingBottom: 8,
	},
	songRow: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 11,
		paddingVertical: 9,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	songRowSelected: {
		backgroundColor: '#fdf8fb',
		borderColor: '#c58aa0',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 7,
		borderWidth: 1,
		borderColor: '#bbbbbb',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	checkboxSelected: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	songNumberBadge: {
		minWidth: 34,
		height: 30,
		paddingHorizontal: 6,
		borderRadius: 9,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	songNumberText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#6d3549',
	},
	songRowMeta: {
		flex: 1,
	},
	songTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	songSubtitle: {
		fontSize: 12,
		color: '#666666',
		marginTop: 2,
	},
	hymnalTag: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 8,
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 999,
		backgroundColor: '#f5e0e9',
	},
	hymnalTagText: {
		marginLeft: 3,
		fontSize: 10,
		fontWeight: '700',
		color: '#6d3549',
	},
	resetButton: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	resetButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#8a314c',
		textDecorationLine: 'underline',
	},
	resetConfirmBox: {
		marginBottom: 10,
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#fff0f4',
		borderWidth: 1,
		borderColor: '#f3c6d5',
	},
	resetConfirmText: {
		fontSize: 12,
		lineHeight: 17,
		color: '#8a314c',
		marginBottom: 8,
	},
	emptyText: {
		fontSize: 13,
		color: '#999999',
		textAlign: 'center',
		paddingVertical: 12,
	},
	footerActions: {
		marginTop: 8,
	},
	selectedCountText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666666',
		textAlign: 'center',
		marginBottom: 8,
	},
	footerButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	actionButton: {
		flex: 1,
		minHeight: 44,
		paddingVertical: 11,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButton: {
		backgroundColor: '#f0f0f0',
		marginRight: 6,
	},
	cancelButtonText: {
		color: '#444444',
		fontSize: 14,
		fontWeight: '600',
	},
	saveButton: {
		backgroundColor: '#6d3549',
		marginLeft: 6,
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
});

export default SameMelodySheet;
