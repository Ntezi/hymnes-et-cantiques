import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';

import { AppSong, getAllSongs } from './library';
import {
	createFavoriteCategory,
	FavoriteCategory,
	loadFavoriteCategories,
} from './favoriteCategories';
import ManageCategorySheet from './ManageCategorySheet';

const FavoriteSongsScreen = ({ navigation }) => {
	const { t } = useTranslation();
	const allSongs = useMemo(() => getAllSongs(), []);
	const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
	const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [managedCategory, setManagedCategory] = useState<FavoriteCategory | null>(null);
	const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	useEffect(() => {
		setExpandedCategoryIds((prevExpandedCategoryIds) =>
			prevExpandedCategoryIds.filter((categoryId) =>
				favoriteCategories.some((category) => category.id === categoryId)
			)
		);
	}, [favoriteCategories]);

	const toggleCategoryExpansion = useCallback((categoryId: string) => {
		setExpandedCategoryIds((prevExpandedCategoryIds) =>
			prevExpandedCategoryIds.includes(categoryId)
				? prevExpandedCategoryIds.filter((id) => id !== categoryId)
				: [...prevExpandedCategoryIds, categoryId]
		);
	}, []);

	useEffect(() => {
		navigation.setOptions({
			title: t('favorites.title'),
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
	}, [navigation, t]);

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
					{song.collection_name} • {resolveLanguageLabel(song.language_code, song.language_label)}
				</Text>
			</View>
			<Icon name="chevron-forward" size={16} color="#b3b3b3" />
		</TouchableOpacity>
	);

	const renderCategoryCard = ({ item }: { item: FavoriteCategory }) => {
		const songsInCategory = item.songIds
			.map(songId => allSongs.find(song => song.song_id === songId))
			.filter((song): song is AppSong => Boolean(song));
		const isExpanded = expandedCategoryIds.includes(item.id);
		const visibleSongs = isExpanded ? songsInCategory : songsInCategory.slice(0, 3);

		return (
			<View style={styles.categoryCard}>
				<View style={styles.categoryHeader}>
					<View style={styles.categoryTitleWrap}>
						<Text style={styles.categoryTitle} numberOfLines={1}>{item.name}</Text>
						<Text style={styles.categoryCount}>
							{item.songIds.length} {t('common.song', { count: item.songIds.length })}
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
						<Text style={styles.emptySongsText}>{t('favorites.noSongsInCategory')}</Text>
					</View>
				) : (
					<View>
						{visibleSongs.map(song => renderSongRow(song, songsInCategory))}
						{songsInCategory.length > 3 ? (
							<TouchableOpacity
								style={styles.moreSongsButton}
								activeOpacity={0.8}
								onPress={() => toggleCategoryExpansion(item.id)}
							>
								<Text style={styles.moreSongsText}>
									{isExpanded
										? t('favorites.showLess')
										: t('favorites.moreSongs', { count: songsInCategory.length - 3 })}
								</Text>
							</TouchableOpacity>
						) : null}
					</View>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.introCard}>
				<Text style={styles.introTitle}>{t('favorites.introTitle')}</Text>
				<Text style={styles.introText}>{t('favorites.introText')}</Text>
			</View>

			{showNewCategoryForm ? (
				<View style={styles.newCategoryCard}>
					<TextInput
						placeholder={t('favorites.categoryNamePlaceholder')}
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
							<Text style={styles.newCategoryCreateButtonText}>{t('common.create')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.newCategoryActionButton, styles.newCategoryCancelButton]}
							onPress={() => {
								setShowNewCategoryForm(false);
								setNewCategoryName('');
							}}
						>
							<Text style={styles.newCategoryCancelButtonText}>{t('common.cancel')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<TouchableOpacity
					style={styles.newCategoryTrigger}
					onPress={() => setShowNewCategoryForm(true)}
				>
					<Icon name="add" size={18} color="#ffffff" />
					<Text style={styles.newCategoryTriggerText}>{t('favorites.newCategory')}</Text>
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
						<Text style={styles.emptyTitle}>{t('favorites.emptyTitle')}</Text>
						<Text style={styles.emptyText}>{t('favorites.emptyText')}</Text>
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
		fontSize: 12,
		color: '#6d3549',
		fontWeight: '600',
		textAlign: 'center',
	},
	moreSongsButton: {
		borderTopWidth: 1,
		borderTopColor: '#f5f5f5',
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#fcf4f8',
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
