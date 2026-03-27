import React, { useEffect, useState } from 'react';
import {
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
	deleteFavoriteCategory,
	FavoriteCategory,
	renameFavoriteCategory,
} from './favoriteCategories';

interface ManageCategorySheetProps {
	visible: boolean;
	category: FavoriteCategory | null;
	onClose: () => void;
	onUpdated?: (categories: FavoriteCategory[]) => void;
}

const ManageCategorySheet = ({
	visible,
	category,
	onClose,
	onUpdated,
}: ManageCategorySheetProps) => {
	const [mode, setMode] = useState<'actions' | 'rename' | 'delete'>('actions');
	const [renameValue, setRenameValue] = useState('');

	useEffect(() => {
		if (!visible || !category) {
			return;
		}

		setMode('actions');
		setRenameValue(category.name);
	}, [visible, category]);

	if (!category) {
		return null;
	}

	const handleRename = async () => {
		const nextName = renameValue.trim();
		if (!nextName || nextName === category.name) {
			setMode('actions');
			return;
		}

		const updatedCategories = await renameFavoriteCategory(category.id, nextName);
		onUpdated?.(updatedCategories);
		onClose();
	};

	const handleDelete = async () => {
		const updatedCategories = await deleteFavoriteCategory(category.id);
		onUpdated?.(updatedCategories);
		onClose();
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
						<Text style={styles.sheetTitle}>Manage Category</Text>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					{mode === 'delete' ? (
						<View style={styles.dangerCard}>
							<Text style={styles.dangerTitle}>Delete "{category.name}"?</Text>
							<Text style={styles.dangerText}>
								This removes the category and its {category.songIds.length}{' '}
								{category.songIds.length === 1 ? 'song' : 'songs'} from this group.
							</Text>
							<View style={styles.inlineActionsRow}>
								<TouchableOpacity
									style={[styles.inlineActionButton, styles.deleteButton]}
									onPress={handleDelete}
								>
									<Text style={styles.deleteButtonText}>Delete</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.inlineActionButton, styles.cancelButton]}
									onPress={() => setMode('actions')}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : mode === 'rename' ? (
						<View style={styles.renameCard}>
							<Text style={styles.fieldLabel}>Category name</Text>
							<TextInput
								value={renameValue}
								onChangeText={setRenameValue}
								placeholder="Category name"
								placeholderTextColor="#999999"
								style={styles.renameInput}
							/>
							<View style={styles.inlineActionsRow}>
								<TouchableOpacity
									style={[styles.inlineActionButton, styles.saveButton]}
									onPress={handleRename}
									disabled={renameValue.trim().length === 0}
								>
									<Text style={styles.saveButtonText}>Save</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.inlineActionButton, styles.cancelButton]}
									onPress={() => setMode('actions')}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<View>
							<TouchableOpacity
								style={styles.actionCard}
								onPress={() => setMode('rename')}
							>
								<View style={[styles.actionIconWrap, styles.renameActionIconWrap]}>
									<Icon name="pencil-outline" size={18} color="#6d3549" />
								</View>
								<View style={styles.actionTextWrap}>
									<Text style={styles.actionTitle}>Rename Category</Text>
									<Text style={styles.actionSubtitle}>Change the category title</Text>
								</View>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.actionCard}
								onPress={() => setMode('delete')}
							>
								<View style={[styles.actionIconWrap, styles.deleteActionIconWrap]}>
									<Icon name="trash-outline" size={18} color="#b42318" />
								</View>
								<View style={styles.actionTextWrap}>
									<Text style={styles.deleteActionTitle}>Delete Category</Text>
									<Text style={styles.actionSubtitle}>Remove this category and its songs</Text>
								</View>
							</TouchableOpacity>
						</View>
					)}
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
	actionCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	renameActionIconWrap: {
		backgroundColor: '#fdf2f6',
	},
	deleteActionIconWrap: {
		backgroundColor: '#fef3f2',
	},
	actionTextWrap: {
		marginLeft: 10,
		flex: 1,
	},
	actionTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	deleteActionTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#b42318',
	},
	actionSubtitle: {
		marginTop: 2,
		fontSize: 12,
		color: '#666666',
	},
	renameCard: {
		backgroundColor: '#fafafa',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		padding: 12,
	},
	fieldLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666666',
		marginBottom: 6,
	},
	renameInput: {
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
	dangerCard: {
		backgroundColor: '#fef3f2',
		borderWidth: 1,
		borderColor: '#fecdca',
		borderRadius: 12,
		padding: 12,
	},
	dangerTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1a1a1a',
		marginBottom: 6,
	},
	dangerText: {
		fontSize: 13,
		color: '#666666',
		marginBottom: 12,
	},
	inlineActionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	inlineActionButton: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButton: {
		backgroundColor: '#6d3549',
		marginRight: 6,
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	deleteButton: {
		backgroundColor: '#b42318',
		marginRight: 6,
	},
	deleteButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	cancelButton: {
		backgroundColor: '#f0f0f0',
		marginLeft: 6,
	},
	cancelButtonText: {
		color: '#444444',
		fontSize: 14,
		fontWeight: '600',
	},
});

export default ManageCategorySheet;
