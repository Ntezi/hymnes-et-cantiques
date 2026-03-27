import React, { useEffect, useState } from 'react';
import {
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface QuickNumberSheetProps {
	visible: boolean;
	onClose: () => void;
	onSubmit: (songNumber: number) => void;
}

const QuickNumberSheet = ({ visible, onClose, onSubmit }: QuickNumberSheetProps) => {
	const [number, setNumber] = useState('');

	useEffect(() => {
		if (visible) {
			setNumber('');
		}
	}, [visible]);

	const onPressDigit = (digit: string) => {
		if (number.length >= 3) {
			return;
		}
		setNumber(prev => `${prev}${digit}`);
	};

	const onBackspace = () => {
		setNumber(prev => prev.slice(0, -1));
	};

	const onGo = () => {
		const parsed = parseInt(number, 10);
		if (!Number.isFinite(parsed)) {
			return;
		}
		onSubmit(parsed);
	};

	const renderDigitButton = (digit: string) => (
		<TouchableOpacity
			key={digit}
			style={styles.digitButton}
			onPress={() => onPressDigit(digit)}
		>
			<Text style={styles.digitText}>{digit}</Text>
		</TouchableOpacity>
	);

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
						<Text style={styles.sheetTitle}>Quick Number</Text>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Icon name="close" size={20} color="#666666" />
						</TouchableOpacity>
					</View>

					<View style={styles.displayCard}>
						<Text style={styles.displayLabel}>Song Number</Text>
						<Text style={styles.displayNumber}>{number || '0'}</Text>
					</View>

					<View style={styles.keypadGrid}>
						{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(renderDigitButton)}
						<TouchableOpacity style={styles.actionButton} onPress={onBackspace}>
							<Icon name="backspace-outline" size={22} color="#666666" />
						</TouchableOpacity>
						{renderDigitButton('0')}
						<TouchableOpacity
							style={[styles.actionButton, styles.goButton, number.length === 0 && styles.goButtonDisabled]}
							disabled={number.length === 0}
							onPress={onGo}
						>
							<Text style={styles.goButtonText}>Go</Text>
						</TouchableOpacity>
					</View>
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
	displayCard: {
		backgroundColor: '#fafafa',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 14,
	},
	displayLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666666',
		marginBottom: 4,
	},
	displayNumber: {
		fontSize: 30,
		fontWeight: '700',
		color: '#1a1a1a',
	},
	keypadGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	digitButton: {
		width: '31%',
		height: 58,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	digitText: {
		fontSize: 24,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	actionButton: {
		width: '31%',
		height: 58,
		borderRadius: 12,
		backgroundColor: '#f5f5f5',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	goButton: {
		backgroundColor: '#6d3549',
	},
	goButtonDisabled: {
		backgroundColor: '#cccccc',
	},
	goButtonText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#ffffff',
	},
});

export default QuickNumberSheet;
