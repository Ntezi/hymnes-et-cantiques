import React, { useEffect, useMemo, useState } from 'react';
import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { AppSong, getAllSongs, getCollectionById } from './library';
import { loadFavoriteSongIds } from './favorites';
import { loadRecentSongIds } from './recentSongs';

const RecentScreen = ({ navigation }) => {
	const { t } = useTranslation();
	const allSongs = useMemo(() => getAllSongs(), []);
	const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);
	const [recentSongIds, setRecentSongIds] = useState<string[]>([]);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: t('recent.title'),
			headerTitleStyle: {
				fontSize: 18,
				fontWeight: '600',
			},
		});
	}, [navigation, t]);

	useEffect(() => {
		const loadData = async () => {
			const [loadedFavorites, loadedRecent] = await Promise.all([
				loadFavoriteSongIds(),
				loadRecentSongIds(),
			]);
			setFavoriteSongIds(loadedFavorites);
			setRecentSongIds(loadedRecent);
		};

		const unsubscribe = navigation.addListener('focus', loadData);
		loadData();
		return unsubscribe;
	}, [navigation]);

	const recentSongs = useMemo(
		() =>
			recentSongIds
				.map(songId => allSongs.find(song => song.song_id === songId))
				.filter((song): song is AppSong => Boolean(song)),
		[recentSongIds, allSongs]
	);
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	const isFavorite = (songId: string) => favoriteSongIds.includes(songId);

	const navigateToSong = (song: AppSong) => {
		const collectionSongs = getCollectionById(song.collection_id)?.songs || [song];
		navigation.navigate('SongDetail', {
			...song,
			songs: collectionSongs,
		});
	};

	const renderItem = ({ item }: { item: AppSong }) => (
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
						{item.collection_name} • {resolveLanguageLabel(item.language_code, item.language_label)}
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

	return (
		<SafeAreaView style={styles.container}>
			<FlatList
				data={recentSongs}
				renderItem={renderItem}
				keyExtractor={(item) => item.song_id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyWrap}>
						<Icon name="time-outline" size={34} color="#c28c9b" />
						<Text style={styles.emptyTitle}>{t('recent.emptyTitle')}</Text>
						<Text style={styles.emptyText}>{t('recent.emptyText')}</Text>
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
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 16,
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
	emptyWrap: {
		marginTop: 30,
		alignItems: 'center',
		paddingHorizontal: 24,
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

export default RecentScreen;
