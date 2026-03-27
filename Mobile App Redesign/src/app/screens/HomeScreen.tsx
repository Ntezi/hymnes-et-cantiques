import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Heart, Library, Clock, Grid3x3, Hash } from 'lucide-react';
import { useApp } from '../context';
import { songs, collections } from '../data';
import { SongCard } from '../components/SongCard';
import { BottomNav } from '../components/BottomNav';
import { QuickNumberSheet } from '../components/QuickNumberSheet';
import { WelcomeGuide } from '../components/WelcomeGuide';

export function HomeScreen() {
  const navigate = useNavigate();
  const { recentSongs, currentCollection } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showQuickNumber, setShowQuickNumber] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    // Show welcome only on first visit
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    return !hasSeenWelcome;
  });

  const handleCloseWelcome = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  // Filter songs by current collection
  const collectionSongs = songs.filter(s => s.collection === currentCollection);
  
  // Get current collection info
  const currentCollectionInfo = collections.find(c => c.id === currentCollection);
  
  // Get recent songs
  const recentSongItems = recentSongs
    .slice(0, 6)
    .map(r => songs.find(s => s.id === r.songId))
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-25">
      {/* Header */}
      <div className="bg-gradient-to-b from-maroon-800 to-maroon-700 px-5 pt-12 pb-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl mb-1" style={{ fontWeight: 600 }}>
              {currentCollectionInfo?.name || 'Hymnes et Cantiques'}
            </h1>
            <button
              onClick={() => navigate('/collections')}
              className="text-maroon-100 text-sm flex items-center gap-1 hover:text-white transition-colors"
            >
              <Library className="w-3.5 h-3.5" />
              {currentCollectionInfo?.language || 'Kinyarwanda'}
            </button>
          </div>
          <button
            onClick={() => navigate('/favorites')}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Heart className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="w-full bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm hover:bg-white transition-colors"
        >
          <Search className="w-5 h-5 text-neutral-400" />
          <span className="text-neutral-500 text-left">
            Andika numero cg title...
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 pb-20">
        {/* Recent Songs */}
        {recentSongItems.length > 0 && (
          <div className="px-5 py-6 bg-white border-b border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-maroon-700" />
                <h2 className="text-neutral-900" style={{ fontSize: '17px', fontWeight: 600 }}>
                  Recent
                </h2>
              </div>
            </div>
            <div className="space-y-2">
              {recentSongItems.slice(0, 3).map(song => (
                song && <SongCard key={song.id} song={song} compact />
              ))}
            </div>
          </div>
        )}

        {/* Browse All Songs */}
        <div className="px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-neutral-900" style={{ fontSize: '17px', fontWeight: 600 }}>
              Browse All Songs
            </h2>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
            >
              <Grid3x3 className="w-4.5 h-4.5 text-neutral-600" />
            </button>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-2">
              {collectionSongs.slice(0, 30).map(song => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {collectionSongs.slice(0, 100).map(song => (
                <button
                  key={song.id}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className="aspect-square rounded-xl bg-white border border-neutral-200 hover:border-maroon-300 hover:bg-maroon-50 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  <span className="text-neutral-700" style={{ fontSize: '15px', fontWeight: 500 }}>
                    {song.number}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="home" />
      
      {/* Floating quick number button */}
      <button
        onClick={() => setShowQuickNumber(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-maroon-800 hover:bg-maroon-900 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all active:scale-95 max-w-md mx-auto"
        style={{ zIndex: 40 }}
        aria-label="Quick jump to song number"
      >
        <Hash className="w-6 h-6" />
      </button>
      
      {showQuickNumber && (
        <QuickNumberSheet onClose={() => setShowQuickNumber(false)} />
      )}
      
      {showWelcome && (
        <WelcomeGuide onClose={handleCloseWelcome} />
      )}
    </div>
  );
}