import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SongInfo } from './songInfo';

interface SongInfoSheetProps {
	visible: boolean;
	songNumber: number;
	songTitle: string;
	info: SongInfo | null;
	onClose: () => void;
}

const SongInfoSheet = ({
	visible,
	songNumber,
	songTitle,
	info,
	onClose,
}: SongInfoSheetProps) => {
	const rows = [
		{ key: 'speed', label: 'Vitesse', value: info?.speed ? String(info.speed) : null },
		{ key: 'sound', label: 'Son', value: info?.sound || null },
		{ key: 'paroles', label: 'Paroles de', value: info?.paroles_de || null },
		{ key: 'musique', label: 'Musique de', value: info?.musique_de || null },
		{ key: 'metres', label: 'Mètres', value: info?.metres || null },
		{ key: 'melodie', label: 'Mélodie', value: info?.melodie || null },
	].filter((row) => Boolean(row.value));

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
						<View style={styles.titleWrap}>
							<Icon name="information-circle-outline" size={19} color="#6d3549" />
							<Text style={styles.sheetTitle}>Informations du cantique</Text>
						</View>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					<Text style={styles.songRefText} numberOfLines={2}>
						{songNumber}. {songTitle}
					</Text>

					<ScrollView style={styles.contentWrap} contentContainerStyle={styles.contentContainer}>
						{rows.length === 0 ? (
							<Text style={styles.emptyText}>Aucune information disponible pour ce cantique.</Text>
						) : (
							rows.map((row) => (
								<View key={row.key} style={styles.rowCard}>
									<Text style={styles.rowLabel}>{row.label}</Text>
									<Text style={styles.rowValue}>{row.value}</Text>
								</View>
							))
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
		maxHeight: '75%',
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	titleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sheetTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1a1a1a',
		marginLeft: 6,
	},
	closeButton: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	songRefText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#666666',
		marginBottom: 12,
	},
	contentWrap: {
		maxHeight: 420,
	},
	contentContainer: {
		paddingBottom: 8,
	},
	emptyText: {
		fontSize: 13,
		color: '#666666',
		textAlign: 'center',
		paddingVertical: 14,
	},
	rowCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 8,
	},
	rowLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#6d3549',
		marginBottom: 3,
	},
	rowValue: {
		fontSize: 14,
		lineHeight: 20,
		color: '#222222',
	},
});

export default SongInfoSheet;
