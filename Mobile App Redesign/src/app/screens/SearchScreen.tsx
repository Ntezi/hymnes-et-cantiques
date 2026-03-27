import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { songs } from '../data';
import { useApp } from '../context';
import { SongCard } from '../components/SongCard';
import { BottomNav } from '../components/BottomNav';

export function SearchScreen() {
  const navigate = useNavigate();
  const { currentCollection } = useApp();
  const [query, setQuery] = useState('');

  // Filter songs by current collection
  const collectionSongs = songs.filter(s => s.collection === currentCollection);

  // Search logic
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    
    return collectionSongs.filter(song => {
      // Search by number
      if (song.number.toString() === lowerQuery) return true;
      
      // Search by title
      if (song.title.toLowerCase().includes(lowerQuery)) return true;
      
      // Search by subtitle
      if (song.subtitle?.toLowerCase().includes(lowerQuery)) return true;
      
      return false;
    });
  }, [query, collectionSongs]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-25">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-neutral-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-neutral-900 text-xl" style={{ fontWeight: 600 }}>
            Search
          </h1>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or title..."
            autoFocus
            className="w-full bg-neutral-50 rounded-xl pl-11 pr-4 py-3.5 border border-neutral-200 focus:border-maroon-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon-100 transition-all"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-5 py-6 pb-24">
        {!query.trim() ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
              <Search className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-neutral-500">
              Search for hymns by number or title
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
              <Search className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-neutral-900 mb-1" style={{ fontWeight: 500 }}>
              No results found
            </p>
            <p className="text-neutral-500 text-sm">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-neutral-500 text-sm mb-4">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
            </p>
            {searchResults.map(song => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  );
}
