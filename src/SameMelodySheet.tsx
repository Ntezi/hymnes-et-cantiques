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

interface SameMelodySheetProps {
	visible: boolean;
	currentSong: AppSong;
	allSongs: AppSong[];
	selectedSongIds: string[];
	onClose: () => void;
	onSave: (songIds: string[]) => void;
}

const SameMelodySheet = ({
	visible,
	currentSong,
	allSongs,
	selectedSongIds,
	onClose,
	onSave,
}: SameMelodySheetProps) => {
	const [search, setSearch] = useState('');
	const [draftSelection, setDraftSelection] = useState<string[]>([]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		setSearch('');
		setDraftSelection(selectedSongIds);
	}, [visible, selectedSongIds]);

	const filteredSongs = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		const candidateSongs = allSongs.filter(song => song.song_id !== currentSong.song_id);

		if (!normalizedSearch) {
			return candidateSongs;
		}

		return candidateSongs.filter(song =>
			song.title.toLowerCase().includes(normalizedSearch)
			|| song.song_number.toString() === normalizedSearch
			|| (song.sub_title || '').toLowerCase().includes(normalizedSearch)
		);
	}, [allSongs, currentSong.song_id, search]);

	const isSelected = (songId: string) => draftSelection.includes(songId);

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
			>
				<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
					{selected ? <Icon name="checkmark" size={14} color="#ffffff" /> : null}
				</View>
				<View style={styles.songRowMeta}>
					<Text style={styles.songTitle} numberOfLines={1}>{item.song_number}. {item.title}</Text>
					<Text style={styles.songSubtitle} numberOfLines={1}>
						{item.collection_name} • {item.language_label}
					</Text>
				</View>
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
						<Text style={styles.sheetTitle}>Same Melody</Text>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					<Text style={styles.currentSongText} numberOfLines={2}>
						Current: {currentSong.song_number}. {currentSong.title}
					</Text>

					<View style={styles.searchWrap}>
						<Icon name="search-outline" size={17} color="#999999" style={styles.searchIcon} />
						<TextInput
							placeholder="Search songs by number or title..."
							placeholderTextColor="#999999"
							value={search}
							onChangeText={setSearch}
							style={styles.searchInput}
						/>
					</View>

					<FlatList
						data={filteredSongs}
						renderItem={renderSongItem}
						keyExtractor={(item) => item.song_id}
						style={styles.list}
						contentContainerStyle={styles.listContent}
						ListEmptyComponent={<Text style={styles.emptyText}>No songs found.</Text>}
					/>

					<View style={styles.footerActions}>
						<TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
							<Text style={styles.cancelButtonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionButton, styles.saveButton]}
							onPress={() => onSave(draftSelection)}
						>
							<Text style={styles.saveButtonText}>Save</Text>
						</TouchableOpacity>
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
	sheetTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1a1a1a',
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
		paddingVertical: 10,
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
	emptyText: {
		fontSize: 13,
		color: '#999999',
		textAlign: 'center',
		paddingVertical: 12,
	},
	footerActions: {
		marginTop: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	actionButton: {
		flex: 1,
		paddingVertical: 10,
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
