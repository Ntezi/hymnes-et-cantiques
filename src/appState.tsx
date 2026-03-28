import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from './i18n';
import { DEFAULT_COLLECTION_ID, getCollections } from './library';

const SELECTED_COLLECTION_KEY = 'app_selected_collection_id';
const UI_LANGUAGE_KEY = 'app_ui_language';

const SUPPORTED_UI_LANGUAGES = ['rw', 'fr', 'en'] as const;
export type UiLanguageCode = (typeof SUPPORTED_UI_LANGUAGES)[number];

const resolveDefaultUiLanguage = (): UiLanguageCode => {
	const localeLanguage = Localization.getLocales()?.[0]?.languageCode?.toLowerCase() || 'en';
	if (localeLanguage === 'rw') {
		return 'rw';
	}
	if (localeLanguage === 'fr') {
		return 'fr';
	}
	return 'en';
};

interface AppStateContextType {
	selectedCollectionId: string;
	setSelectedCollectionId: (collectionId: string) => void;
	uiLanguage: UiLanguageCode;
	setUiLanguage: (language: UiLanguageCode) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
	const collections = useMemo(() => getCollections(), []);
	const fallbackCollectionId = collections[0]?.id || DEFAULT_COLLECTION_ID;
	const defaultUiLanguage = useMemo(resolveDefaultUiLanguage, []);
	const [selectedCollectionId, setSelectedCollectionIdState] = useState(fallbackCollectionId);
	const [uiLanguage, setUiLanguageState] = useState<UiLanguageCode>(defaultUiLanguage);

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

	const value = useMemo(() => ({
		selectedCollectionId,
		setSelectedCollectionId,
		uiLanguage,
		setUiLanguage,
	}), [selectedCollectionId, setSelectedCollectionId, uiLanguage, setUiLanguage]);

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
