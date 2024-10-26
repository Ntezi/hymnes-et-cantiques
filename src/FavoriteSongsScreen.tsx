import React, { useState, useEffect } from 'react';
import { SafeAreaView, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

import SongData from './songs.json';

const FavoriteSongsScreen = ({ navigation }) => {
    const [favorites, setFavorites] = useState([]);
    const [songs, setSongs] = useState(SongData);  // Assuming SongData is available

    useEffect(() => {
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

    const removeFavorite = async (songNumber) => {
        const updatedFavorites = favorites.filter(fav => fav !== songNumber);
        setFavorites(updatedFavorites);
        await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    };

    const renderRightActions = (songNumber) => (
        <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFavorite(songNumber)}
        >
            <Icon name="trash-outline" size={30} color="white" />
        </TouchableOpacity>
    );

    const renderItem = ({ item }) => (
        <Swipeable
            renderRightActions={() => renderRightActions(item.song_number)}
        >
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => navigation.navigate('SongDetail', {
                    title: item.title,
                    song_number: item.song_number,
                    verses: item.verses,
                    sub_title: item.sub_title,
                    songs: songs,
                })}
            >
                <Text style={styles.itemText}>{item.song_number}. {item.title}</Text>
            </TouchableOpacity>
        </Swipeable>
    );

    // Filter only favorite songs
    const favoriteSongs = songs.filter(song => favorites.includes(song.song_number));

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={favoriteSongs}
                renderItem={renderItem}
                keyExtractor={(item) => item.song_number.toString()}
                ListEmptyComponent={<Text style={styles.emptyMessage}>No favorites yet</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 15,
        marginVertical: 8,
        marginHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        elevation: 2,
    },
    itemText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#733752',
    },
    removeButton: {
        backgroundColor: '#733752',
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        height: '100%',
    },
    removeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyMessage: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
        color: '#733752',
    },
});

export default FavoriteSongsScreen;