import React, { useEffect, useMemo, useState } from 'react';
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
	addSongToFavoriteCategory,
	createFavoriteCategory,
	FavoriteCategory,
	getSongFavoriteCategories,
	loadFavoriteCategories,
	removeSongFromFavoriteCategory,
} from './favoriteCategories';
import { useTranslation } from 'react-i18next';

interface AddToFavoriteSheetProps {
	visible: boolean;
	songId: string;
	onClose: () => void;
	onUpdated?: (categories: FavoriteCategory[]) => void;
}

const AddToFavoriteSheet = ({
	visible,
	songId,
	onClose,
	onUpdated,
}: AddToFavoriteSheetProps) => {
	const { t } = useTranslation();
	const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
	const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!visible) {
			return;
		}

		let isMounted = true;
		setShowNewCategoryForm(false);
		setNewCategoryName('');
		setIsLoading(true);

		(async () => {
			const loadedCategories = await loadFavoriteCategories();
			if (!isMounted) {
				return;
			}

			setFavoriteCategories(loadedCategories);
			setIsLoading(false);
		})();

		return () => {
			isMounted = false;
		};
	}, [visible]);

	const songCategories = useMemo(
		() => getSongFavoriteCategories(favoriteCategories, songId),
		[favoriteCategories, songId]
	);

	const handleCreateCategory = async () => {
		const categoryName = newCategoryName.trim();
		if (!categoryName) {
			return;
		}

		const updatedCategories = await createFavoriteCategory(categoryName, [songId]);
		setFavoriteCategories(updatedCategories);
		onUpdated?.(updatedCategories);
		setShowNewCategoryForm(false);
		setNewCategoryName('');
	};

	const toggleCategory = async (categoryId: string) => {
		const isSelected = songCategories.some(category => category.id === categoryId);
		const updatedCategories = isSelected
			? await removeSongFromFavoriteCategory(categoryId, songId)
			: await addSongToFavoriteCategory(categoryId, songId);

		setFavoriteCategories(updatedCategories);
		onUpdated?.(updatedCategories);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.backdrop}>
				<TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onClose} />
				<View style={styles.sheet}>
					<View style={styles.headerRow}>
						<Text style={styles.sheetTitle}>{t('favorites.addToFavorites')}</Text>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
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
							<View style={styles.newCategoryActionsRow}>
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
							<Icon name="add" size={18} color="#6d3549" />
							<Text style={styles.newCategoryTriggerText}>{t('favorites.newCategory')}</Text>
						</TouchableOpacity>
					)}

					<ScrollView style={styles.categoriesWrap} contentContainerStyle={styles.categoriesContent}>
						{isLoading ? (
							<Text style={styles.emptyText}>{t('common.loading')}</Text>
						) : favoriteCategories.length === 0 ? (
							<Text style={styles.emptyText}>{t('favorites.emptySheetText')}</Text>
						) : (
							favoriteCategories.map((category) => {
								const isSelected = songCategories.some(item => item.id === category.id);
								return (
									<TouchableOpacity
										key={category.id}
										style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
										onPress={() => toggleCategory(category.id)}
									>
										<View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
											{isSelected ? <Icon name="checkmark" size={14} color="#ffffff" /> : null}
										</View>
										<View style={styles.categoryMeta}>
											<Text style={styles.categoryName}>{category.name}</Text>
											<Text style={styles.categoryCountText}>
												{category.songIds.length} {t('common.song', { count: category.songIds.length })}
											</Text>
										</View>
										<Icon
											name={isSelected ? 'heart' : 'heart-outline'}
											size={18}
											color={isSelected ? '#6d3549' : '#b3b3b3'}
										/>
									</TouchableOpacity>
								);
							})
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	backdropTapArea: {
		flex: 1,
	},
	sheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: 20,
		paddingTop: 14,
		paddingBottom: 24,
		maxHeight: '85%',
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sheetTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	closeButton: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	newCategoryTrigger: {
		backgroundColor: '#fdf2f6',
		borderWidth: 1,
		borderColor: '#f5d6e1',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	newCategoryTriggerText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6d3549',
		marginLeft: 6,
	},
	newCategoryCard: {
		backgroundColor: '#fafafa',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
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
	newCategoryActionsRow: {
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
	categoriesWrap: {
		maxHeight: 360,
	},
	categoriesContent: {
		paddingBottom: 6,
	},
	categoryCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	categoryCardSelected: {
		backgroundColor: '#fdf8fb',
		borderColor: '#c58aa0',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 7,
		borderWidth: 1,
		borderColor: '#bbbbbb',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	checkboxSelected: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	categoryMeta: {
		flex: 1,
	},
	categoryName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	categoryCountText: {
		marginTop: 2,
		fontSize: 12,
		color: '#666666',
	},
	emptyText: {
		paddingVertical: 18,
		textAlign: 'center',
		fontSize: 13,
		color: '#777777',
	},
});

export default AddToFavoriteSheet;
