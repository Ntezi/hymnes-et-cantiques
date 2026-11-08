import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import Icon from 'react-native-vector-icons/Ionicons';

import { resolveDefaultUiLanguage, UiLanguageCode, useAppState } from './appState';

// Shown once, on the very first launch. Strings are fixed here (not i18n) because no language is chosen yet.
const TITLES = [
	'Hitamo ururimi',
	'Choisissez votre langue',
	'Choose your language',
	'Tia wò gbe',
];

const OPTIONS: { code: UiLanguageCode; label: string }[] = [
	{ code: 'rw', label: 'Kinyarwanda' },
	{ code: 'fr', label: 'Français' },
	{ code: 'en', label: 'English' },
	{ code: 'ee', label: 'Eʋegbe' },
];

const CONTINUE_LABEL = 'Komeza · Continuer · Continue · Yi ŋgɔ';

const LanguageChoiceScreen = () => {
	const { completeLanguageChoice } = useAppState();
	// The device language is only the preselected option.
	const [selected, setSelected] = useState<UiLanguageCode>(resolveDefaultUiLanguage);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<Icon name="globe-outline" size={44} color="#6d3549" style={styles.icon} />
				{TITLES.map((title, index) => (
					<Text key={title} style={index === 2 ? styles.titlePrimary : styles.title}>{title}</Text>
				))}
				<View style={styles.options}>
					{OPTIONS.map(({ code, label }) => {
						const isSelected = code === selected;
						return (
							<TouchableOpacity
								key={code}
								style={[styles.option, isSelected && styles.optionSelected]}
								onPress={() => setSelected(code)}
								accessibilityRole="radio"
								accessibilityState={{ selected: isSelected }}
							>
								<Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{label}</Text>
								{isSelected ? <Icon name="checkmark-circle" size={22} color="#ffffff" /> : null}
							</TouchableOpacity>
						);
					})}
				</View>
				<TouchableOpacity style={styles.continueButton} onPress={() => completeLanguageChoice(selected)}>
					<Text style={styles.continueText}>{CONTINUE_LABEL}</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fafafa',
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 32,
	},
	icon: {
		alignSelf: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 16,
		color: '#666666',
		textAlign: 'center',
		marginBottom: 4,
	},
	titlePrimary: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1a1a1a',
		textAlign: 'center',
		marginBottom: 4,
	},
	options: {
		marginTop: 24,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e6e6e6',
		borderRadius: 14,
		paddingHorizontal: 18,
		paddingVertical: 16,
		marginBottom: 10,
	},
	optionSelected: {
		backgroundColor: '#6d3549',
		borderColor: '#6d3549',
	},
	optionText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	optionTextSelected: {
		color: '#ffffff',
	},
	continueButton: {
		marginTop: 18,
		backgroundColor: '#6d3549',
		borderRadius: 14,
		paddingVertical: 15,
		alignItems: 'center',
	},
	continueText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#ffffff',
	},
});

export default LanguageChoiceScreen;
