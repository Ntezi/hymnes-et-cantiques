import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from './i18n';
import { DEFAULT_COLLECTION_ID, getCollections } from './library';

const SELECTED_COLLECTION_KEY = 'app_selected_collection_id';
const UI_LANGUAGE_KEY = 'app_ui_language';

const SUPPORTED_UI_LANGUAGES = ['rw', 'fr', 'en', 'ee'] as const;
export type UiLanguageCode = (typeof SUPPORTED_UI_LANGUAGES)[number];

// Default hymn collection for each language offered by the first-run picker.
export const COLLECTION_BY_UI_LANGUAGE: Record<UiLanguageCode, string> = {
	rw: 'hymnes-rw',
	fr: 'hymnes-fr',
	en: 'hymnes-en',
	ee: 'hymnes-ee',
};

export const resolveDefaultUiLanguage = (): UiLanguageCode => {
	const localeLanguage = Localization.getLocales()?.[0]?.languageCode?.toLowerCase() || 'en';
	if (localeLanguage === 'rw') {
		return 'rw';
	}
	if (localeLanguage === 'fr') {
		return 'fr';
	}
	if (localeLanguage === 'ee') {
		return 'ee';
	}
	return 'en';
};

interface AppStateContextType {
	selectedCollectionId: string;
	setSelectedCollectionId: (collectionId: string) => void;
	uiLanguage: UiLanguageCode;
	setUiLanguage: (language: UiLanguageCode) => void;
	// null until storage has been read; true on a fresh install (nothing stored yet).
	needsLanguageChoice: boolean | null;
	completeLanguageChoice: (language: UiLanguageCode) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
	const collections = useMemo(() => getCollections(), []);
	const fallbackCollectionId = collections[0]?.id || DEFAULT_COLLECTION_ID;
	const defaultUiLanguage = useMemo(resolveDefaultUiLanguage, []);
	const [selectedCollectionId, setSelectedCollectionIdState] = useState(fallbackCollectionId);
	const [uiLanguage, setUiLanguageState] = useState<UiLanguageCode>(defaultUiLanguage);
	const [needsLanguageChoice, setNeedsLanguageChoice] = useState<boolean | null>(null);

	useEffect(() => {
		let isMounted = true;

		(async () => {
			try {
				const [storedCollectionId, storedUiLanguage] = await Promise.all([
					AsyncStorage.getItem(SELECTED_COLLECTION_KEY),
					AsyncStorage.getItem(UI_LANGUAGE_KEY),
				]);
				if (!isMounted) {
					return;
				}

				// Nothing stored: first run. Nothing is written until the person chooses, so closing the
				// app before choosing shows the picker again. Anyone with a stored value is an existing user.
				if (storedCollectionId === null && storedUiLanguage === null) {
					setNeedsLanguageChoice(true);
					i18n.changeLanguage(defaultUiLanguage);
					return;
				}
				setNeedsLanguageChoice(false);

				const allowedCollectionIds = collections.map(collection => collection.id);
				const nextCollectionId = storedCollectionId && allowedCollectionIds.includes(storedCollectionId)
					? storedCollectionId
					: fallbackCollectionId;
				setSelectedCollectionIdState(nextCollectionId);
				if (storedCollectionId !== nextCollectionId) {
					await AsyncStorage.setItem(SELECTED_COLLECTION_KEY, nextCollectionId);
				}

				const nextUiLanguage = SUPPORTED_UI_LANGUAGES.includes(storedUiLanguage as UiLanguageCode)
					? storedUiLanguage as UiLanguageCode
					: defaultUiLanguage;
				setUiLanguageState(nextUiLanguage);
				await i18n.changeLanguage(nextUiLanguage);
				if (storedUiLanguage !== nextUiLanguage) {
					await AsyncStorage.setItem(UI_LANGUAGE_KEY, nextUiLanguage);
				}
			} catch {
				if (isMounted) {
					setSelectedCollectionIdState(fallbackCollectionId);
					setUiLanguageState(defaultUiLanguage);
					// Storage could not be read: ask, rather than silently opening the Kinyarwanda hymnal.
					setNeedsLanguageChoice(true);
					i18n.changeLanguage(defaultUiLanguage);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [collections, fallbackCollectionId, defaultUiLanguage]);

	const setSelectedCollectionId = useCallback((collectionId: string) => {
		setSelectedCollectionIdState(collectionId);
		AsyncStorage.setItem(SELECTED_COLLECTION_KEY, collectionId).catch(() => {
			// ignore write failures; state is already updated for this session
		});
	}, []);

	const setUiLanguage = useCallback((language: UiLanguageCode) => {
		setUiLanguageState(language);
		i18n.changeLanguage(language);
		AsyncStorage.setItem(UI_LANGUAGE_KEY, language).catch(() => {
			// ignore write failures; state is already updated for this session
		});
	}, []);

	const completeLanguageChoice = useCallback((language: UiLanguageCode) => {
		setUiLanguage(language);
		const collectionId = COLLECTION_BY_UI_LANGUAGE[language];
		setSelectedCollectionId(
			collections.some(collection => collection.id === collectionId) ? collectionId : fallbackCollectionId
		);
		setNeedsLanguageChoice(false);
	}, [collections, fallbackCollectionId, setSelectedCollectionId, setUiLanguage]);

	const value = useMemo(() => ({
		selectedCollectionId,
		setSelectedCollectionId,
		uiLanguage,
		setUiLanguage,
		needsLanguageChoice,
		completeLanguageChoice,
	}), [selectedCollectionId, setSelectedCollectionId, uiLanguage, setUiLanguage, needsLanguageChoice, completeLanguageChoice]);

	return (
		<AppStateContext.Provider value={value}>
			{children}
		</AppStateContext.Provider>
	);
};

export const useAppState = () => {
	const context = useContext(AppStateContext);
	if (!context) {
		throw new Error('useAppState must be used within AppStateProvider');
	}
	return context;
};
