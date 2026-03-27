import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TextInput,
	TouchableOpacity,
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppSong, getCollectionById } from './library';
import { loadFavoriteSongIds } from './favorites';
import { useAppState } from './appState';

const SearchScreen = ({ navigation }) => {
	const { selectedCollectionId } = useAppState();
	const [search, setSearch] = useState('');
	const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);

	const selectedCollection = useMemo(
		() => getCollectionById(selectedCollectionId),
		[selectedCollectionId]
	);

	const collectionSongs = useMemo<AppSong[]>(
		() => selectedCollection?.songs || [],
		[selectedCollection]
	);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: 'Search',
			headerTitleStyle: {
				fontSize: 18,
				fontWeight: '600',
			},
		});
	}, [navigation]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', async () => {
			const loaded = await loadFavoriteSongIds();
			setFavoriteSongIds(loaded);
		});

		(async () => {
			const loaded = await loadFavoriteSongIds();
			setFavoriteSongIds(loaded);
		})();

		return unsubscribe;
	}, [navigation]);

	const filteredSongs = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		if (!normalizedSearch) {
			return [];
		}

		return collectionSongs.filter(song =>
			song.title.toLowerCase().includes(normalizedSearch)
			|| song.song_number.toString() === normalizedSearch
			|| (song.sub_title || '').toLowerCase().includes(normalizedSearch)
		);
	}, [collectionSongs, search]);

	const navigateToSong = (song: AppSong) => {
		navigation.navigate('SongDetail', {
			...song,
			songs: filteredSongs.length > 0 ? filteredSongs : collectionSongs,
		});
	};

	const renderListItem = ({ item }: { item: AppSong }) => (
		<TouchableOpacity
			style={styles.songCard}
			activeOpacity={0.8}
			onPress={() => navigateToSong(item)}
		>
			<View style={styles.songCardLeft}>
				<View style={[styles.numberBadge, favoriteSongIds.includes(item.song_id) && styles.numberBadgeFav]}>
					<Text style={[styles.numberBadgeText, favoriteSongIds.includes(item.song_id) && styles.numberBadgeTextFav]}>
						{item.song_number}
					</Text>
				</View>
				<View style={styles.songMeta}>
					<Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
					<Text style={styles.songSubtitle} numberOfLines={1}>
						{item.collection_name} • {item.language_label}
					</Text>
				</View>
			</View>
			<View style={styles.songCardRight}>
				{favoriteSongIds.includes(item.song_id) ? (
					<Icon name="heart" size={16} color="#8f4b5d" style={{ marginRight: 4 }} />
				) : null}
				<Icon name="chevron-forward" size={18} color="#b3b3b3" />
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.searchWrap}>
				<Icon name="search-outline" size={18} color="#999999" style={styles.searchIcon} />
				<TextInput
					placeholder="Search by number or title..."
					placeholderTextColor="#999999"
					onChangeText={setSearch}
					value={search}
					style={styles.searchInput}
				/>
			</View>

			{search.trim().length === 0 ? (
				<View style={styles.emptyStateWrap}>
					<Icon name="search-outline" size={32} color="#c28c9b" />
					<Text style={styles.emptyStateTitle}>Start typing to search</Text>
					<Text style={styles.emptyStateText}>
						Search songs by number, title, or subtitle.
					</Text>
				</View>
			) : filteredSongs.length === 0 ? (
				<View style={styles.emptyStateWrap}>
					<Icon name="albums-outline" size={32} color="#c28c9b" />
					<Text style={styles.emptyStateTitle}>No Results Found</Text>
					<Text style={styles.emptyStateText}>
						Try a different song title or number.
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredSongs}
					renderItem={renderListItem}
					keyExtractor={(item) => item.song_id}
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={
						<Text style={styles.resultsText}>
							{filteredSongs.length} result{filteredSongs.length > 1 ? 's' : ''}
						</Text>
					}
				/>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	searchWrap: {
		backgroundColor: '#ffffff',
		marginHorizontal: 16,
		marginTop: 12,
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
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	resultsText: {
		fontSize: 13,
		color: '#666666',
		marginBottom: 10,
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
});

export default SearchScreen;
