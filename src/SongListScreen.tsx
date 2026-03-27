import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	TextInput,
	ScrollView,
	Alert,
} from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import Icon from 'react-native-vector-icons/Ionicons';
import {
	AppSong,
	ENABLE_COLLECTION_FILTERS,
	getCollectionById,
	getCollections,
	getLanguageNavOptions,
	getSongTypeOptions,
} from './library';
import { loadFavoriteSongIds } from './favorites';
import { useAppState } from './appState';
import QuickNumberSheet from './QuickNumberSheet';

const SongListScreen = ({ navigation }) => {
	const collections = useMemo(() => getCollections(), []);
	const { selectedCollectionId, setSelectedCollectionId } = useAppState();
	const [search, setSearch] = useState('');
	const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [isQuickNumberVisible, setIsQuickNumberVisible] = useState(false);
	const [selectedSongType, setSelectedSongType] = useState('all');

	const selectedCollection = useMemo(
		() => getCollectionById(selectedCollectionId) || collections[0],
		[selectedCollectionId, collections]
	);

	const collectionSongs = useMemo<AppSong[]>(
		() => selectedCollection?.songs || [],
		[selectedCollection]
	);

	const songTypeOptions = useMemo(
		() => [
			{ id: 'all', label: 'All Types' },
			...getSongTypeOptions(selectedCollectionId),
		],
		[selectedCollectionId]
	);

	const languageNavOptions = useMemo(() => getLanguageNavOptions(), [collections]);

	useEffect(() => {
		if (!selectedCollection && collections[0]) {
			setSelectedCollectionId(collections[0].id);
		}
	}, [collections, selectedCollection, setSelectedCollectionId]);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: selectedCollection?.library_name || 'Hymnes et Cantiques',
			headerTitleStyle: {
				fontSize: 18,
				fontWeight: '600',
			},
		});
	}, [navigation, selectedCollection]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', async () => {
			const loadedFavorites = await loadFavoriteSongIds();
			setFavoriteSongIds(loadedFavorites);
		});

		(async () => {
			const loadedFavorites = await loadFavoriteSongIds();
			setFavoriteSongIds(loadedFavorites);
		})();

		return unsubscribe;
	}, [navigation]);

	useEffect(() => {
		if (!ENABLE_COLLECTION_FILTERS) {
			if (selectedSongType !== 'all') {
				setSelectedSongType('all');
			}
			return;
		}

		const nextOptions = [
			'all',
			...getSongTypeOptions(selectedCollectionId).map(item => item.id),
		];
		if (!nextOptions.includes(selectedSongType)) {
			setSelectedSongType('all');
		}
	}, [selectedCollectionId, selectedSongType]);

	const isFavorite = (songId: string) => favoriteSongIds.includes(songId);

	const filteredSongs = useMemo(() => collectionSongs.filter(song => {
		const matchesType = !ENABLE_COLLECTION_FILTERS
			|| selectedSongType === 'all'
			|| song.song_type_id === selectedSongType;
		const normalizedSearch = search.trim().toLowerCase();
		const matchesSearch = normalizedSearch.length === 0
			|| song.title.toLowerCase().includes(normalizedSearch)
			|| song.song_number.toString() === normalizedSearch;

		return matchesType && matchesSearch;
	}), [collectionSongs, selectedSongType, search]);

	const navigateToSong = (song: AppSong) => {
		navigation.navigate('SongDetail', {
			...song,
			songs: filteredSongs,
		});
	};

	const onSubmitQuickNumber = (songNumber: number) => {
		const matchedSong = collectionSongs.find(song => song.song_number === songNumber);
		if (!matchedSong) {
			Alert.alert('Song not found', `No song #${songNumber} in this collection.`);
			return;
		}

		setIsQuickNumberVisible(false);
		navigateToSong(matchedSong);
	};

	const renderListItem = ({ item }: { item: AppSong }) => (
		<TouchableOpacity
			style={styles.songCard}
			activeOpacity={0.8}
			onPress={() => navigateToSong(item)}
		>
			<View style={styles.songCardLeft}>
				<View style={[styles.numberBadge, isFavorite(item.song_id) && styles.numberBadgeFav]}>
					<Text style={[styles.numberBadgeText, isFavorite(item.song_id) && styles.numberBadgeTextFav]}>
						{item.song_number}
					</Text>
				</View>
				<View style={styles.songMeta}>
					<Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
					<Text style={styles.songSubtitle} numberOfLines={1}>
						{item.song_type_label} • {item.language_label}
					</Text>
				</View>
			</View>
			<View style={styles.songCardRight}>
				{isFavorite(item.song_id) ? (
					<Icon name="heart" size={16} color="#8f4b5d" style={{ marginRight: 4 }} />
				) : null}
				<Icon name="chevron-forward" size={18} color="#b3b3b3" />
			</View>
		</TouchableOpacity>
	);

	const renderGridItem = ({ item }: { item: AppSong }) => (
		<TouchableOpacity
			style={[styles.gridItem, isFavorite(item.song_id) && styles.gridItemFav]}
			activeOpacity={0.8}
			onPress={() => navigateToSong(item)}
		>
			<Text style={[styles.gridItemText, isFavorite(item.song_id) && styles.gridItemTextFav]}>
				{item.song_number}
			</Text>
		</TouchableOpacity>
	);

	const renderCollectionChip = (collectionId: string, label: string) => (
		<TouchableOpacity
			key={collectionId}
			style={[
				styles.filterChip,
				selectedCollectionId === collectionId && styles.filterChipActive,
			]}
			onPress={() => setSelectedCollectionId(collectionId)}
		>
			<Text style={[
				styles.filterChipText,
				selectedCollectionId === collectionId && styles.filterChipTextActive,
			]}>
				{label}
			</Text>
		</TouchableOpacity>
	);

	const renderSongTypeChip = (id: string, label: string) => (
		<TouchableOpacity
			key={id}
			style={[
				styles.filterChip,
				selectedSongType === id && styles.filterChipActive,
			]}
			onPress={() => setSelectedSongType(id)}
		>
			<Text style={[
				styles.filterChipText,
				selectedSongType === id && styles.filterChipTextActive,
			]}>
				{label}
			</Text>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<View style={styles.container}>
				{ENABLE_COLLECTION_FILTERS ? (
					<>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.filterRow}
						>
							{collections.map((collection) =>
								renderCollectionChip(collection.id, collection.name)
							)}
						</ScrollView>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={[styles.filterRow, styles.secondFilterRow]}
						>
							{languageNavOptions.map(option =>
								renderCollectionChip(option.collection_id, option.language_label)
							)}
						</ScrollView>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={[styles.filterRow, styles.thirdFilterRow]}
						>
							{songTypeOptions.map(option => renderSongTypeChip(option.id, option.label))}
						</ScrollView>
					</>
				) : null}

					<View style={styles.searchWrap}>
						<Icon name="search-outline" size={18} color="#999999" style={styles.searchIcon} />
						<TextInput
							placeholder="Andika numero cg title..."
							placeholderTextColor="#999999"
						onChangeText={setSearch}
						value={search}
						style={styles.searchInput}
					/>
					<TouchableOpacity
						style={styles.viewToggle}
						onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
					>
						<Icon
							name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
							size={18}
							color="#666666"
							/>
						</TouchableOpacity>
					</View>

					{filteredSongs.length === 0 ? (
						<View style={styles.emptyStateWrap}>
							<Icon name="albums-outline" size={32} color="#c28c9b" />
							<Text style={styles.emptyStateTitle}>No Songs in This View</Text>
						<Text style={styles.emptyStateText}>
							{ENABLE_COLLECTION_FILTERS
								? 'Change collection, language, or song type filters.'
								: 'No songs found for the current search.'}
						</Text>
					</View>
				) : viewMode === 'list' ? (
					<FlatList
						data={filteredSongs}
						renderItem={renderListItem}
						keyExtractor={(item) => item.song_id}
						contentContainerStyle={styles.listContent}
					/>
				) : (
					<FlatList
						data={filteredSongs}
						key="grid"
						numColumns={5}
						renderItem={renderGridItem}
						keyExtractor={(item) => item.song_id}
						contentContainerStyle={styles.gridContent}
							columnWrapperStyle={styles.gridRow}
						/>
					)}

					<TouchableOpacity
						style={styles.quickNumberFab}
						onPress={() => setIsQuickNumberVisible(true)}
						activeOpacity={0.85}
					>
						<Icon name="keypad-outline" size={22} color="#ffffff" />
					</TouchableOpacity>

					<QuickNumberSheet
						visible={isQuickNumberVisible}
						onClose={() => setIsQuickNumberVisible(false)}
						onSubmit={onSubmitQuickNumber}
					/>
				</View>
			</SafeAreaView>
		);
	}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	filterRow: {
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 4,
	},
	secondFilterRow: {
		paddingTop: 0,
	},
	thirdFilterRow: {
		paddingTop: 0,
		paddingBottom: 8,
	},
	filterChip: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginRight: 8,
	},
	filterChipActive: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	filterChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#666666',
	},
	filterChipTextActive: {
		color: '#ffffff',
	},
	searchWrap: {
		backgroundColor: '#ffffff',
		marginHorizontal: 16,
		marginTop: 4,
		marginBottom: 12,
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 4,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	searchIcon: {
		marginRight: 6,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: '#1a1a1a',
		paddingVertical: 12,
	},
	viewToggle: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 96,
	},
	songCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 4,
		elevation: 2,
	},
	songCardLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	songCardRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	numberBadge: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	numberBadgeFav: {
		backgroundColor: '#8f4b5d',
	},
	numberBadgeText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6d3549',
	},
	numberBadgeTextFav: {
		color: '#ffffff',
	},
	songMeta: {
		marginLeft: 12,
		flex: 1,
	},
	songTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	songSubtitle: {
		fontSize: 13,
		color: '#666666',
		marginTop: 2,
	},
	gridContent: {
		paddingHorizontal: 12,
		paddingBottom: 96,
	},
	gridRow: {
		justifyContent: 'space-between',
	},
	gridItem: {
		backgroundColor: 'white',
		width: 50,
		height: 50,
		marginVertical: 8,
		marginHorizontal: 3,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e6e6e6',
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 3.84,
		elevation: 2,
	},
	gridItemFav: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	gridItemText: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		color: '#6d3549'
	},
	gridItemTextFav: {
		color: 'white',
	},
	emptyStateWrap: {
		marginTop: 30,
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	emptyStateTitle: {
		marginTop: 12,
		fontSize: 18,
		fontWeight: '600',
		color: '#6d3549',
	},
	emptyStateText: {
		marginTop: 4,
		fontSize: 13,
		textAlign: 'center',
		color: '#666666',
	},
	quickNumberFab: {
		position: 'absolute',
		right: 18,
		bottom: 18,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#6d3549',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 6,
	},
});

export default SongListScreen;
