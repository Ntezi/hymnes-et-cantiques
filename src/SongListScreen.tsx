import {SearchBar} from "@rneui/base";
import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView} from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import SongData from './songs.json';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from 'react-native-vector-icons/Ionicons';

const SongListScreen = ({navigation}) => {
	const [songs, setSongs] = useState([]);
	const [search, setSearch] = useState('');
	const [favorites, setFavorites] = useState([]);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: 'Hymnes et Cantiques',
			headerTitleStyle: {
				fontSize: 24,
				fontWeight: 'bold',
				textAlign: 'center',
			},
			headerTitleContainerStyle: {
				flexGrow: 4,
				justifyContent: 'center',
			},
			headerRight: () => (
				<TouchableOpacity onPress={() => navigation.navigate('FavoriteSongs')}>
					<Icon name="heart" size={24} color="#FFFFFF" style={{ marginRight: 15 }} />
				</TouchableOpacity>
			),
		});

		setSongs(SongData);
		loadFavorites();
	}, []);

	const loadFavorites = async () => {
		try {
			const favs = await AsyncStorage.getItem('favorites');
			if (favs !== null) {
				setFavorites(JSON.parse(favs));
			}
		} catch (e) {
			console.error('Failed to load favorites.');
		}
	};

	const isFavorite = (songNumber) => favorites.includes(songNumber);

	const updateSearch = (search) => {
		setSearch(search);
	};

	const renderItem = ({ item }) => (
		<TouchableOpacity
			style={[
				styles.itemContainer,
				isFavorite(item.song_number) && styles.favoriteItemContainer,  // Apply different style if favorite
			]}
			onPress={() =>
				navigation.navigate('SongDetail', {
					title: item.title,
					song_number: item.song_number,
					verses: item.verses,
					sub_title: item.sub_title,
					songs: songs,
				})
			}
		>
			<Text style={[
				styles.itemText,
				isFavorite(item.song_number) && styles.favoriteItemText,  // Apply different text style if favorite
			]}>
				{item.song_number}
			</Text>
		</TouchableOpacity>
	);


	const filteredSongs = songs.filter(song =>
		song.title.toLowerCase().includes(search.toLowerCase()) ||
		song.song_number.toString() === search.trim()
	);


	return (
		<SafeAreaView style={{ flex: 1 }}>
			<SearchBar
				placeholder="Andika numero cg title..."
				onChangeText={updateSearch}
				value={search}
				inputContainerStyle={{ backgroundColor: 'white' }}
				containerStyle={{ backgroundColor: 'white', borderBottomColor: 'transparent', borderTopColor: 'transparent', elevation: 5, shadowOpacity: 0 }}
			/>

			<View style={styles.container}>
				<FlatList
					data={filteredSongs}
					numColumns={5}
					renderItem={renderItem}
					keyExtractor={(item) => item.song_number.toString()}
					columnWrapperStyle={styles.row}
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	itemContainer: {
		backgroundColor: 'white',
		width: 50,
		height: 50,
		margin: 10,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 25,
		// iOS shadow properties
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		// Android shadow properties
		elevation: 5,
	},
	itemText: {
		fontSize: 18,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#733752'
	},
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	headerTitleContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	favoriteItemContainer: {
		backgroundColor: '#733752',
	},
	favoriteItemText: {
		color: 'white',
	},
});

export default SongListScreen;
