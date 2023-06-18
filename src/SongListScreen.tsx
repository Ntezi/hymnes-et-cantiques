import {SearchBar} from "@rneui/base";
import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import SafeAreaView from "react-native-safe-area-view";
import SongData from './songs.json';

const SongListScreen = ({navigation}) => {
	const [selectedSong, setSelectedSong] = useState(null);
	const [songs, setSongs] = useState([]);
	const [search, setSearch] = useState('');
	useEffect(() => {
		navigation.setOptions({
			headerTitle: 'Hymnes et Cantiques',
			headerTitleStyle: {
				fontSize: 28,
				fontWeight: 'bold',
				textAlign: 'center',
			},
			headerTitleContainerStyle: {
				flexGrow: 4,
				justifyContent: 'center',
			},
		});
		setSongs(SongData);
	}, []);

	const updateSearch = (search) => {
		setSearch(search);
	};

	const renderItem = ({item}) => (
		<TouchableOpacity
			style={styles.itemContainer}
			onPress={() =>
				navigation.navigate('SongDetail', {
					title: item.title,
					song_number: item.song_number,
					verses: item.verses,
					songs: songs
				})
			}
		>
			<Text style={styles.itemText}>{item.song_number}</Text>
		</TouchableOpacity>
	);

	const filteredSongs = songs.filter(song =>
		song.title.toLowerCase().includes(search.toLowerCase()) ||
		song.song_number.toString() === search.trim()
	);


	return (
		<SafeAreaView style={{flex: 1}}>
			<SearchBar
				placeholder="Andika numero cg title..."
				onChangeText={updateSearch}
				value={search}
				inputContainerStyle={{backgroundColor: '#ccc'}}
				containerStyle={{backgroundColor: 'white', borderBottomColor: 'transparent', borderTopColor: 'transparent', elevation: 0, shadowOpacity: 0}}
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
		backgroundColor: '#ccc',
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
});

export default SongListScreen;
