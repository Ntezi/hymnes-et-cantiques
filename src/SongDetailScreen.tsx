import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import SafeAreaView from "react-native-safe-area-view";
import {Swipeable} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SongDetailScreen = ({route, navigation}) => {
	const {song_number, verses, title, songs} = route.params;
	const [titleText, setTitleText] = useState(title.split('(')[0]);
	const [subtitleText, setSubtitleText] = useState(title.split('(')[1]);
	const [number, setNumber] = useState(song_number);

	useEffect(() => {
		navigation.setOptions({
			headerTitle: () => (
				<View style={styles.headerTitleContainer}>
					<Text style={styles.titleText}>{song_number}.{titleText}</Text>
				</View>
			),
		});
	}, [title]);

	const getSongByNumber = (number) => {
		return songs.find(song => song.song_number === number);
	}
	const getNextSong = () => {
		return getSongByNumber(song_number + 1);
	};

	const getPrevSong = () => {
		return getSongByNumber(song_number - 1);
	};

	const handleSwipeLeft = () => {
		console.log('SWIPE_RIGHT');
		const prevSong = getPrevSong();
		if (prevSong) {
			navigation.navigate('SongDetail', {
				title: prevSong.title,
				song_number: prevSong.song_number,
				verses: prevSong.verses,
				songs: songs
			});
		}
	};

	const handleSwipeRight = () => {
		console.log('SWIPE_LEFT');
		const nextSong = getNextSong();
		if (nextSong) {
			navigation.navigate('SongDetail', {
				title: nextSong.title,
				song_number: nextSong.song_number,
				verses: nextSong.verses,
				songs: songs
			});
		}
	};


	return (
		<SafeAreaView style={styles.container}>
			<Swipeable
				onSwipeableLeftOpen={handleSwipeLeft}
				onSwipeableRightOpen={handleSwipeRight}
				renderLeftActions={(progress, dragX) => {
					const prevSong = getPrevSong();
					return (
						<View style={styles.leftSwipeBox}>
							{prevSong && <Text style={styles.titleText}>{prevSong.song_number}</Text>}
						</View>
					);
				}}
				renderRightActions={(progress, dragX) => {
					const nextSong = getNextSong();
					return (
						<View style={styles.rightSwipeBox}>
							{nextSong && <Text style={styles.titleText}>{nextSong.song_number}</Text>}
						</View>
					);
				}}
			>
				<View style={styles.swipeContentContainer}>
					<View style={styles.swipeArrowContainer}>
						<Icon name="arrow-back" size={30} color="grey" />
					</View>
					<ScrollView
						contentContainerStyle={styles.contentContainer}
					>
						<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
							<Text style={{fontSize: 12, textAlign: 'center'}}>({subtitleText}</Text>
						</View>
						<View style={{alignSelf: 'center', paddingHorizontal: 8}}>
							{verses.map((verse, index) => (
								<View key={index} style={styles.verseContainer}>
									<Text style={styles.verseNumber}>{index + 1}</Text>
									<Text style={styles.verse} key={index}>{
										verse.split("\n").map((line, i) => {
											if (line.includes('R:/')) {
												return (
													<Text key={i}>
														<Text style={{ fontWeight: 'bold' }}>R:/</Text>
														<Text>{line.substring(3)}</Text>{"\n"}
													</Text>
												);
											}
											return (
												<Text key={i}>
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
						<Icon name="arrow-forward" size={30} color="grey" />
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
		justifyContent: 'center',
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	verseContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginVertical: 5,
	},
	verseNumber: {
		fontWeight: 'bold',
		fontSize: 18,
		marginRight: 10,
		marginTop: 3,
	},
	verse: {
		fontSize: 16,
	},
	headerTitle: {
		flexDirection: 'row',
	},
	titleText: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	titleSubtext: {
		fontSize: 16,
		fontWeight: 'normal',
	},
	subtitleText: {
		fontSize: 16,
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
