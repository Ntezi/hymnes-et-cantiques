import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { CollectionItem, getCollections } from './library';
import { UiLanguageCode, useAppState } from './appState';

const CollectionsScreen = ({ navigation }) => {
	const { t } = useTranslation();
	const collections = useMemo(() => getCollections(), []);
	const { selectedCollectionId, setSelectedCollectionId, uiLanguage, setUiLanguage } = useAppState();
	const uiLanguageOptions: UiLanguageCode[] = ['rw', 'fr', 'en'];
	const resolveLanguageLabel = (languageCode: string, fallbackLabel: string) => {
		if (languageCode === 'rw' || languageCode === 'fr' || languageCode === 'en') {
			return t(`languages.${languageCode}`);
		}
		return fallbackLabel;
	};

	useEffect(() => {
		navigation.setOptions({
			headerTitle: t('library.title'),
			headerTitleStyle: {
				fontSize: 18,
				fontWeight: '600',
			},
		});
	}, [navigation, t]);

	const renderItem = ({ item }: { item: CollectionItem }) => {
		const isActive = item.id === selectedCollectionId;

		return (
			<TouchableOpacity
				style={[styles.collectionCard, isActive && styles.collectionCardActive]}
				onPress={() => setSelectedCollectionId(item.id)}
			>
				<View style={styles.collectionCardTop}>
					<View style={[styles.collectionIconWrap, isActive && styles.collectionIconWrapActive]}>
						<Icon
							name="library-outline"
							size={20}
							color={isActive ? '#ffffff' : '#6d3549'}
						/>
					</View>
					{isActive ? (
						<View style={styles.activeChip}>
							<Icon name="checkmark" size={12} color="#ffffff" />
							<Text style={styles.activeChipText}>{t('common.active')}</Text>
						</View>
					) : null}
				</View>
				<Text style={styles.collectionTitle}>{item.name}</Text>
				<Text style={styles.collectionLanguage}>
					{resolveLanguageLabel(item.language_code, item.language_label)}
				</Text>
				<Text style={styles.collectionMeta}>
					{item.songs.length} {t('common.song', { count: item.songs.length })}
				</Text>
				<Text style={styles.collectionDescription}>{item.description}</Text>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<FlatList
				data={collections}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				ListHeaderComponent={
					<View>
						<View style={styles.introCard}>
							<Text style={styles.introTitle}>{t('library.introTitle')}</Text>
							<Text style={styles.introText}>{t('library.introText')}</Text>
						</View>
						<View style={styles.languageCard}>
							<Text style={styles.languageTitle}>{t('library.uiLanguageTitle')}</Text>
							<Text style={styles.languageHint}>{t('library.uiLanguageHint')}</Text>
							<View style={styles.languageRow}>
								{uiLanguageOptions.map((languageCode) => {
									const isActive = uiLanguage === languageCode;
									return (
										<TouchableOpacity
											key={languageCode}
											style={[
												styles.languageChip,
												isActive && styles.languageChipActive,
											]}
											onPress={() => setUiLanguage(languageCode)}
										>
											<Text
												style={[
													styles.languageChipText,
													isActive && styles.languageChipTextActive,
												]}
											>
												{t(`languages.${languageCode}`)}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
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
	introCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
	},
	languageCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
	},
	languageTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	languageHint: {
		fontSize: 12,
		color: '#666666',
		marginBottom: 10,
	},
	languageRow: {
		flexDirection: 'row',
	},
	languageChip: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginRight: 8,
	},
	languageChipActive: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	languageChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666666',
	},
	languageChipTextActive: {
		color: '#ffffff',
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
	collectionCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 14,
		marginBottom: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 4,
		elevation: 2,
	},
	collectionCardActive: {
		borderColor: '#8f4b5d',
		backgroundColor: '#fdf8fb',
	},
	collectionCardTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	collectionIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5e0e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	collectionIconWrapActive: {
		backgroundColor: '#8f4b5d',
	},
	activeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#8f4b5d',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
	},
	activeChipText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#ffffff',
		marginLeft: 3,
	},
	collectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	collectionLanguage: {
		fontSize: 13,
		color: '#8f4b5d',
		marginTop: 2,
		fontWeight: '600',
	},
	collectionMeta: {
		fontSize: 12,
		color: '#666666',
		marginTop: 6,
	},
	collectionDescription: {
		fontSize: 12,
		color: '#666666',
		marginTop: 6,
		lineHeight: 16,
	},
});

export default CollectionsScreen;
