import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SongDetailScreen = ({ route, navigation }) => {
    const { song_number, verses, title, sub_title, songs } = route.params;
    const [titleText, setTitleText] = useState('');
    const [subtitleText, setSubtitleText] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        setTitleText(title);
        setSubtitleText(sub_title);
        loadFavoriteStatus(); // Load the favorite status of the song

        navigation.setOptions({
            headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.titleText}>{song_number}.{titleText}</Text>
                </View>
            ),
        });
    }, [titleText, setTitleText, subtitleText, setSubtitleText, title]);

    // Function to check if the song is in the favorites
    const loadFavoriteStatus = async () => {
        try {
            const favs = await AsyncStorage.getItem('favorites');
            if (favs !== null) {
                const favoriteList = JSON.parse(favs);
                setIsFavorite(favoriteList.includes(song_number));
            }
        } catch (e) {
            console.error('Failed to load favorite status.');
        }
    };

    // Function to toggle the favorite status
    const toggleFavorite = async () => {
        try {
            const favs = await AsyncStorage.getItem('favorites');
            let favoriteList = favs ? JSON.parse(favs) : [];
            if (favoriteList.includes(song_number)) {
                // Remove from favorites
                favoriteList = favoriteList.filter(fav => fav !== song_number);
                setIsFavorite(false);
            } else {
                // Add to favorites
                favoriteList.push(song_number);
                setIsFavorite(true);
            }
            await AsyncStorage.setItem('favorites', JSON.stringify(favoriteList));
        } catch (e) {
            console.error('Failed to update favorite status.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.subtitleText}>{subtitleText}</Text>
                </View>
                <View style={{ alignSelf: 'center' }}>
                    {verses.map((verse, index) => (
                        <View key={index} style={{ ...styles.verseContainer, marginBottom: 10 }}>
                            <Text style={styles.verse} key={index}>{
                                verse.split("\n").map((line, i) => {
                                    if (line.includes('R:/')) {
                                        return (
                                            <Text key={i} style={styles.verseLine}>
                                                <Text style={styles.singingInstructions}>R:/</Text>
                                                <Text>{line.substring(3)}</Text>
                                            </Text>
                                        );
                                    } else if (/^\d+\./.test(line)) {
                                        const [verseNumber, verseText] = line.split('.', 2);
                                        return (
                                            <Text key={i} style={styles.verseLine}>
                                                <Text style={styles.verseNumber}>{verseNumber}.</Text>
                                                <Text>{verseText}</Text>
                                                {"\n"}
                                            </Text>
                                        );
                                    } else {
                                        // Split the line into segments and highlight (ter) and (bis)
                                        return (
                                            <Text key={i} style={styles.verseLine}>
                                                {line.split(' ').map((word, j) =>
                                                    (word === '(ter)' || word === '(bis)') ?
                                                        <Text key={j} style={styles.singingInstructions}>{word} </Text> :
                                                        <Text key={j}>{word} </Text>
                                                )}
                                                {"\n"}
                                            </Text>
                                        );
                                    }
                                })
                            }</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Add to Favorites Button */}
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
                <Text style={styles.favoriteButtonText}>
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        backgroundColor: '#fff',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    verseContainer: {
        flexDirection: 'row',
    },
    verseNumber: {
        fontWeight: 'bold',
        color: '#733752',
        fontSize: 18,
    },
    verse: {
        fontSize: 18,
    },
    verseLine: {
        marginBottom: 5,
    },
    singingInstructions: {
        fontWeight: 'bold',
        color: '#733752',
        fontSize: 12,
        fontStyle: 'italic',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        height: 50,
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'white',
    },
    subtitleText: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#733752',
    },
    contentContainer: {
        paddingBottom: 10,
    },
    favoriteButton: {
        padding: 15,
        backgroundColor: '#733752',
        alignItems: 'center',
        borderRadius: 5,
        marginVertical: 10,
    },
    favoriteButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
});

export default SongDetailScreen;
