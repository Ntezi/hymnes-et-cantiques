import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_COLLECTION_ID, getCollections } from './library';

const SELECTED_COLLECTION_KEY = 'app_selected_collection_id';

interface AppStateContextType {
	selectedCollectionId: string;
	setSelectedCollectionId: (collectionId: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
	const collections = useMemo(() => getCollections(), []);
	const fallbackCollectionId = collections[0]?.id || DEFAULT_COLLECTION_ID;
	const [selectedCollectionId, setSelectedCollectionIdState] = useState(fallbackCollectionId);

	useEffect(() => {
		let isMounted = true;

		(async () => {
			try {
				const storedCollectionId = await AsyncStorage.getItem(SELECTED_COLLECTION_KEY);
				if (!isMounted) {
					return;
				}

				const allowedCollectionIds = collections.map(collection => collection.id);
				if (storedCollectionId && allowedCollectionIds.includes(storedCollectionId)) {
					setSelectedCollectionIdState(storedCollectionId);
					return;
				}

				setSelectedCollectionIdState(fallbackCollectionId);
				await AsyncStorage.setItem(SELECTED_COLLECTION_KEY, fallbackCollectionId);
			} catch {
				if (isMounted) {
					setSelectedCollectionIdState(fallbackCollectionId);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [collections, fallbackCollectionId]);

	const setSelectedCollectionId = useCallback((collectionId: string) => {
		setSelectedCollectionIdState(collectionId);
		AsyncStorage.setItem(SELECTED_COLLECTION_KEY, collectionId).catch(() => {
			// ignore write failures; state is already updated for this session
		});
	}, []);

	const value = useMemo(() => ({
		selectedCollectionId,
		setSelectedCollectionId,
	}), [selectedCollectionId, setSelectedCollectionId]);

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
