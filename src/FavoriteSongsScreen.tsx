import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView, FlatList, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppSong, DEFAULT_COLLECTION_ID, getAllSongs, getCollectionById } from './library';
import { loadFavoriteSongIds, saveFavoriteSongIds } from './favorites';

const FavoriteSongsScreen = ({ navigation }) => {
	const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);
	const allSongs = useMemo(() => getAllSongs(), []);

	useEffect(() => {
		navigation.setOptions({
			title: 'Favorites',
			headerTitleStyle: {
				fontWeight: '600',
			},
		});

		const unsubscribe = navigation.addListener('focus', async () => {
			const loaded = await loadFavoriteSongIds(DEFAULT_COLLECTION_ID);
			setFavoriteSongIds(loaded);
		});

		(async () => {
			const loaded = await loadFavoriteSongIds(DEFAULT_COLLECTION_ID);
			setFavoriteSongIds(loaded);
		})();

		return unsubscribe;
	}, [navigation]);

	const removeFavorite = async (songId: string) => {
		const updatedFavorites = favoriteSongIds.filter(id => id !== songId);
		setFavoriteSongIds(updatedFavorites);
		await saveFavoriteSongIds(updatedFavorites);
	};

	const renderRightActions = (songId: string) => (
		<TouchableOpacity
			style={styles.removeButton}
			onPress={() => removeFavorite(songId)}
		>
			<Icon name="trash-outline" size={30} color="white" />
		</TouchableOpacity>
	);

	const favoriteSongs = useMemo(
		() =>
			favoriteSongIds
				.map(songId => allSongs.find(song => song.song_id === songId))
				.filter((song): song is AppSong => Boolean(song)),
		[favoriteSongIds, allSongs]
	);

	const renderItem = ({ item }: { item: AppSong }) => (
		<Swipeable
			renderRightActions={() => renderRightActions(item.song_id)}
		>
			<TouchableOpacity
				style={styles.itemContainer}
				onPress={() => {
					const collectionSongs = getCollectionById(item.collection_id)?.songs || [item];
					navigation.navigate('SongDetail', {
						...item,
						songs: collectionSongs,
					});
				}}
			>
				<View style={styles.itemLeft}>
					<View style={styles.numberBadge}>
						<Text style={styles.numberBadgeText}>{item.song_number}</Text>
					</View>
					<View style={styles.itemTextWrap}>
						<Text numberOfLines={1} style={styles.itemText}>{item.title}</Text>
						<Text numberOfLines={1} style={styles.itemSubtitle}>
							{item.collection_name} • {item.language_label} • {item.song_type_label}
						</Text>
					</View>
				</View>
				<Icon name="chevron-forward" size={18} color="#b3b3b3" />
			</TouchableOpacity>
		</Swipeable>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.introCard}>
				<Text style={styles.introTitle}>Your Favorite Songs</Text>
				<Text style={styles.introText}>
					Favorites work across collections, song types, and languages.
				</Text>
			</View>
			<FlatList
				data={favoriteSongs}
				renderItem={renderItem}
				keyExtractor={(item) => item.song_id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyWrap}>
						<Icon name="heart-outline" size={34} color="#c28c9b" />
						<Text style={styles.emptyMessage}>No favorites yet</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	introCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 4,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	introTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	introText: {
		fontSize: 13,
		color: '#666666',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 16,
	},
	itemContainer: {
		backgroundColor: 'white',
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginVertical: 6,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e6e6e6',
		elevation: 2,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	itemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	numberBadge: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	numberBadgeText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#6d3549',
	},
	itemTextWrap: {
		marginLeft: 12,
		flex: 1,
	},
	itemText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	itemSubtitle: {
		marginTop: 2,
		fontSize: 12,
		color: '#666666',
	},
	removeButton: {
		backgroundColor: '#6d3549',
		justifyContent: 'center',
		alignItems: 'center',
		width: 64,
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
		height: '100%',
	},
	emptyWrap: {
		marginTop: 30,
		alignItems: 'center',
	},
	emptyMessage: {
		fontSize: 17,
		textAlign: 'center',
		marginTop: 10,
		color: '#8f4b5d',
		fontWeight: '600',
	},
});

export default FavoriteSongsScreen;
