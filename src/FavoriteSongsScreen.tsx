import React, { useEffect, useMemo, useState } from 'react';
import {
	FlatList,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppSong, getAllSongs } from './library';
import {
	createFavoriteCategory,
	FavoriteCategory,
	loadFavoriteCategories,
} from './favoriteCategories';
import ManageCategorySheet from './ManageCategorySheet';

const FavoriteSongsScreen = ({ navigation }) => {
	const allSongs = useMemo(() => getAllSongs(), []);
	const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
	const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [managedCategory, setManagedCategory] = useState<FavoriteCategory | null>(null);

	useEffect(() => {
		navigation.setOptions({
			title: 'Favorites',
			headerTitleStyle: {
				fontWeight: '600',
			},
		});

		const loadCategories = async () => {
			const loadedCategories = await loadFavoriteCategories();
			setFavoriteCategories(loadedCategories);
		};

		const unsubscribe = navigation.addListener('focus', loadCategories);
		loadCategories();

		return unsubscribe;
	}, [navigation]);

	const handleCreateCategory = async () => {
		const categoryName = newCategoryName.trim();
		if (!categoryName) {
			return;
		}

		const updatedCategories = await createFavoriteCategory(categoryName);
		setFavoriteCategories(updatedCategories);
		setShowNewCategoryForm(false);
		setNewCategoryName('');
	};

	const renderSongRow = (song: AppSong, songsInCategory: AppSong[]) => (
		<TouchableOpacity
			key={song.song_id}
			style={styles.songRow}
			onPress={() => {
				navigation.navigate('SongDetail', {
					...song,
					songs: songsInCategory,
				});
			}}
		>
			<View style={styles.songNumberBadge}>
				<Text style={styles.songNumberText}>{song.song_number}</Text>
			</View>
			<View style={styles.songRowMeta}>
				<Text style={styles.songRowTitle} numberOfLines={1}>{song.title}</Text>
				<Text style={styles.songRowSubtitle} numberOfLines={1}>
					{song.collection_name} • {song.language_label}
				</Text>
			</View>
			<Icon name="chevron-forward" size={16} color="#b3b3b3" />
		</TouchableOpacity>
	);

	const renderCategoryCard = ({ item }: { item: FavoriteCategory }) => {
		const songsInCategory = item.songIds
			.map(songId => allSongs.find(song => song.song_id === songId))
			.filter((song): song is AppSong => Boolean(song));

		return (
			<View style={styles.categoryCard}>
				<View style={styles.categoryHeader}>
					<View style={styles.categoryTitleWrap}>
						<Text style={styles.categoryTitle} numberOfLines={1}>{item.name}</Text>
						<Text style={styles.categoryCount}>
							{item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}
						</Text>
					</View>
					<TouchableOpacity
						style={styles.manageButton}
						onPress={() => setManagedCategory(item)}
					>
						<Icon name="ellipsis-vertical" size={15} color="#666666" />
					</TouchableOpacity>
				</View>

				{songsInCategory.length === 0 ? (
					<View style={styles.emptySongsWrap}>
						<Text style={styles.emptySongsText}>No songs in this category yet.</Text>
					</View>
				) : (
					<View>
						{songsInCategory.slice(0, 3).map(song => renderSongRow(song, songsInCategory))}
						{songsInCategory.length > 3 ? (
							<Text style={styles.moreSongsText}>+{songsInCategory.length - 3} more</Text>
						) : null}
					</View>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.introCard}>
				<Text style={styles.introTitle}>Favorite Categories</Text>
				<Text style={styles.introText}>Organize songs into reusable groups.</Text>
			</View>

			{showNewCategoryForm ? (
				<View style={styles.newCategoryCard}>
					<TextInput
						placeholder="Category name..."
						placeholderTextColor="#999999"
						value={newCategoryName}
						onChangeText={setNewCategoryName}
						style={styles.newCategoryInput}
					/>
					<View style={styles.newCategoryActions}>
						<TouchableOpacity
							style={[styles.newCategoryActionButton, styles.newCategoryCreateButton]}
							onPress={handleCreateCategory}
							disabled={newCategoryName.trim().length === 0}
						>
							<Text style={styles.newCategoryCreateButtonText}>Create</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.newCategoryActionButton, styles.newCategoryCancelButton]}
							onPress={() => {
								setShowNewCategoryForm(false);
								setNewCategoryName('');
							}}
						>
							<Text style={styles.newCategoryCancelButtonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<TouchableOpacity
					style={styles.newCategoryTrigger}
					onPress={() => setShowNewCategoryForm(true)}
				>
					<Icon name="add" size={18} color="#ffffff" />
					<Text style={styles.newCategoryTriggerText}>New Category</Text>
				</TouchableOpacity>
			)}

			<FlatList
				data={favoriteCategories}
				renderItem={renderCategoryCard}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyWrap}>
						<Icon name="heart-outline" size={34} color="#c28c9b" />
						<Text style={styles.emptyTitle}>No categories yet</Text>
						<Text style={styles.emptyText}>Create a category, then add songs from Song Detail.</Text>
					</View>
				}
			/>

			<ManageCategorySheet
				visible={Boolean(managedCategory)}
				category={managedCategory}
				onClose={() => setManagedCategory(null)}
				onUpdated={setFavoriteCategories}
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
	newCategoryTrigger: {
		marginHorizontal: 16,
		marginTop: 10,
		backgroundColor: '#6d3549',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	newCategoryTriggerText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '600',
		color: '#ffffff',
	},
	newCategoryCard: {
		marginHorizontal: 16,
		marginTop: 10,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		padding: 12,
	},
	newCategoryInput: {
		borderWidth: 1,
		borderColor: '#e1e1e1',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		paddingHorizontal: 10,
		paddingVertical: 10,
		fontSize: 14,
		color: '#1a1a1a',
		marginBottom: 10,
	},
	newCategoryActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	newCategoryActionButton: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	newCategoryCreateButton: {
		backgroundColor: '#6d3549',
		marginRight: 6,
	},
	newCategoryCreateButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	newCategoryCancelButton: {
		backgroundColor: '#f0f0f0',
		marginLeft: 6,
	},
	newCategoryCancelButtonText: {
		color: '#444444',
		fontSize: 14,
		fontWeight: '600',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 20,
	},
	categoryCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		marginBottom: 10,
		overflow: 'hidden',
	},
	categoryHeader: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	categoryTitleWrap: {
		flex: 1,
		marginRight: 8,
	},
	categoryTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	categoryCount: {
		marginTop: 2,
		fontSize: 12,
		color: '#666666',
	},
	manageButton: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptySongsWrap: {
		paddingHorizontal: 12,
		paddingVertical: 16,
	},
	emptySongsText: {
		fontSize: 12,
		color: '#999999',
	},
	songRow: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#f5f5f5',
	},
	songNumberBadge: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	songNumberText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#6d3549',
	},
	songRowMeta: {
		flex: 1,
		marginLeft: 10,
	},
	songRowTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	songRowSubtitle: {
		marginTop: 1,
		fontSize: 12,
		color: '#666666',
	},
	moreSongsText: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 12,
		color: '#666666',
		textAlign: 'center',
	},
	emptyWrap: {
		marginTop: 30,
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	emptyTitle: {
		marginTop: 10,
		fontSize: 17,
		fontWeight: '600',
		color: '#8f4b5d',
	},
	emptyText: {
		marginTop: 4,
		fontSize: 13,
		color: '#666666',
		textAlign: 'center',
	},
});

export default FavoriteSongsScreen;
