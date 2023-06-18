import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import {Swipeable} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SongDetailScreen = ({route, navigation}) => {
	const {song_number, verses, title, songs} = route.params;
	const [titleText, setTitleText] = useState('');
	const [subtitleText, setSubtitleText] = useState('');

	const swipeableRef = useRef<Swipeable>(null);

	useEffect(() => {
		const [titlePart, subtitlePart] = title.split('(');
		setTitleText(titlePart);
		setSubtitleText(subtitlePart);
		navigation.setOptions({
			headerTitle: () => (
				<View style={styles.headerTitleContainer}>
					<Text style={styles.titleText}>{song_number}.{titleText}</Text>
				</View>
			),
		});
	}, [titleText, setTitleText, subtitleText, setSubtitleText, title]);

	const getSongByNumber = (number) => {
		return songs.find(song => song.song_number === number);
	};

	const handleSwipe = (direction) => {
		const song = getSongByNumber(song_number + direction);
		if (song) {
			navigateToSongDetail(song);
		}
	};

	const navigateToSongDetail = (song) => {
		navigation.navigate('SongDetail', {
			title: song.title,
			song_number: song.song_number,
			verses: song.verses,
			songs: songs
		});
	};

	const handleSwipeLeft = () => {
		console.log('SWIPE_RIGHT');
		handleSwipe(-1);
	};

	const handleSwipeRight = () => {
		console.log('SWIPE_LEFT');
		handleSwipe(1);
	};



	return (
		<SafeAreaView style={styles.container}>
			<Swipeable
				ref={swipeableRef}
				onSwipeableOpen={(direction) => {
					if (direction === 'left') {
						handleSwipeLeft();
					} else if (direction === 'right') {
						handleSwipeRight();
					}
					swipeableRef.current.close(); // Close the swipe box
				}}
				renderLeftActions={(progress, dragX) => {
					const prevSong = getSongByNumber(song_number - 1);
					return (
						<View style={styles.leftSwipeBox}>
							{prevSong && <Text style={styles.numberText}>{prevSong.song_number}</Text>}
						</View>
					);
				}}
				renderRightActions={(progress, dragX) => {
					const nextSong = getSongByNumber(song_number + 1);
					return (
						<View style={styles.rightSwipeBox}>
							{nextSong && <Text style={styles.numberText}>{nextSong.song_number}</Text>}
						</View>
					);
				}}
			>
				<View style={styles.swipeContentContainer}>
					<View style={styles.swipeArrowContainer}>
						<Icon name="arrow-back" size={30} color="#733752" />
					</View>
					<ScrollView
						contentContainerStyle={styles.contentContainer}
					>
						<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
							<Text style={styles.subtitleText}>({subtitleText}</Text>
						</View>
						<View style={{alignSelf: 'center', paddingHorizontal: 8}}>
							{verses.map((verse, index) => (
								<View key={index} style={styles.verseContainer}>
									<Text style={styles.verseNumber}>{index + 1}</Text>
									<Text style={styles.verse} key={index}>{
										verse.split("\n").map((line, i) => {
											if (line.includes('R:/')) {
												return (
													<Text key={i} style={styles.verseLine}>
														<Text style={{ fontWeight: 'bold' }}>R:/</Text>
														<Text>{line.substring(3)}</Text>
													</Text>
												);
											}
											return (
												<Text key={i} style={styles.verseLine}>
													{line}
													{"\n"}
												</Text>
											);
										})
									}</Text>
								</View>
							))}
						</View>
					</ScrollView>
					<View style={styles.swipeArrowContainer}>
						<Icon name="arrow-forward" size={30} color="#733752" />
					</View>
				</View>
			</Swipeable>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: '#fff',
		marginBottom: 5,
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	verseContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: -48
	},
	verseNumber: {
		fontWeight: 'bold',
		fontSize: 18,
		marginRight: 10,
		marginTop: 3,
	},
	verse: {
		fontSize: 18,
	},
	verseLine: {
		marginBottom: 5,
	},
	headerTitle: {
		flexDirection: 'row',
	},
	titleText: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		color: 'white'
	},
	numberText: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#733752'
	},
	titleSubtext: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	subtitleText: {
		fontSize: 16,
		textAlign: 'center',
		fontWeight: 'bold',
	},
	headerTitleContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		height: 50,
	},
	parenthesesContainer: {
		marginLeft: 5,
		marginRight: 5,
	},
	parenthesesText: {
		fontSize: 14,
		color: '#777',
		fontStyle: 'italic',
	},
	contentContainer: {
		paddingHorizontal: 16,
		paddingBottom: 32,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#eee',
	},
	footerText: {
		color: '#007AFF',
		fontWeight: 'bold',
	},

	leftSwipeBox: {
		width: 100,
		backgroundColor: 'white',
		justifyContent: 'center',
		padding: 10,
	},
	rightSwipeBox: {
		width: 100,
		backgroundColor: 'white',
		justifyContent: 'center',
		padding: 10,
	},
	swipeContentContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	swipeArrowContainer: {
		width: 30, // or any value you prefer
		alignItems: 'center',
		justifyContent: 'center',
	},

});

export default SongDetailScreen;
