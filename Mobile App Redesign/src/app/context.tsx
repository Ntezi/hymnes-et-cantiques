import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FavoriteCategory, RecentSong } from './types';
import { defaultFavoriteCategories } from './data';

interface AppContextType {
  // Collection & Language
  currentCollection: string;
  setCurrentCollection: (id: string) => void;
  
  // Favorites
  favoriteCategories: FavoriteCategory[];
  createFavoriteCategory: (name: string) => void;
  deleteFavoriteCategory: (id: string) => void;
  renameFavoriteCategory: (id: string, newName: string) => void;
  addSongToCategory: (categoryId: string, songId: string) => void;
  removeSongFromCategory: (categoryId: string, songId: string) => void;
  isSongFavorited: (songId: string) => boolean;
  getSongCategories: (songId: string) => FavoriteCategory[];
  
  // Recent songs
  recentSongs: RecentSong[];
  addRecentSong: (songId: string) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentCollection, setCurrentCollection] = useState('hc-kinyarwanda');
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>(() => {
    const saved = localStorage.getItem('favoriteCategories');
    return saved ? JSON.parse(saved) : defaultFavoriteCategories;
  });
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>(() => {
    const saved = localStorage.getItem('recentSongs');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Save to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem('favoriteCategories', JSON.stringify(favoriteCategories));
  }, [favoriteCategories]);

  useEffect(() => {
    localStorage.setItem('recentSongs', JSON.stringify(recentSongs));
  }, [recentSongs]);

  const createFavoriteCategory = (name: string) => {
    const newCategory: FavoriteCategory = {
      id: `cat-${Date.now()}`,
      name,
      songIds: [],
      createdAt: new Date(),
    };
    setFavoriteCategories([...favoriteCategories, newCategory]);
  };

  const deleteFavoriteCategory = (id: string) => {
    setFavoriteCategories(favoriteCategories.filter(cat => cat.id !== id));
  };

  const renameFavoriteCategory = (id: string, newName: string) => {
    setFavoriteCategories(
      favoriteCategories.map(cat =>
        cat.id === id ? { ...cat, name: newName } : cat
      )
    );
  };

  const addSongToCategory = (categoryId: string, songId: string) => {
    setFavoriteCategories(
      favoriteCategories.map(cat => {
        if (cat.id === categoryId && !cat.songIds.includes(songId)) {
          return { ...cat, songIds: [...cat.songIds, songId] };
        }
        return cat;
      })
    );
  };

  const removeSongFromCategory = (categoryId: string, songId: string) => {
    setFavoriteCategories(
      favoriteCategories.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, songIds: cat.songIds.filter(id => id !== songId) };
        }
        return cat;
      })
    );
  };

  const isSongFavorited = (songId: string): boolean => {
    return favoriteCategories.some(cat => cat.songIds.includes(songId));
  };

  const getSongCategories = (songId: string): FavoriteCategory[] => {
    return favoriteCategories.filter(cat => cat.songIds.includes(songId));
  };

  const addRecentSong = (songId: string) => {
    const newRecent: RecentSong = {
      songId,
      timestamp: new Date(),
    };
    // Remove if already exists, then add to front
    const filtered = recentSongs.filter(r => r.songId !== songId);
    const updated = [newRecent, ...filtered].slice(0, 20); // Keep last 20
    setRecentSongs(updated);
  };

  return (
    <AppContext.Provider
      value={{
        currentCollection,
        setCurrentCollection,
        favoriteCategories,
        createFavoriteCategory,
        deleteFavoriteCategory,
        renameFavoriteCategory,
        addSongToCategory,
        removeSongFromCategory,
        isSongFavorited,
        getSongCategories,
        recentSongs,
        addRecentSong,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
