import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Heart, MoreVertical, Plus } from 'lucide-react';
import { songs } from '../data';
import { useApp } from '../context';
import { AddToFavoriteSheet } from '../components/AddToFavoriteSheet';

export function SongDetailScreen() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const { addRecentSong, isSongFavorited, getSongCategories } = useApp();
  const [showFavoriteSheet, setShowFavoriteSheet] = useState(false);

  const song = songs.find(s => s.id === songId);
  
  useEffect(() => {
    if (song) {
      addRecentSong(song.id);
    }
  }, [song, addRecentSong]);

  if (!song) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-25">
        <p className="text-neutral-500">Song not found</p>
      </div>
    );
  }

  const isFavorite = isSongFavorited(song.id);
  const categories = getSongCategories(song.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-100">
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavoriteSheet(true)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isFavorite
                  ? 'bg-maroon-100 hover:bg-maroon-200'
                  : 'bg-neutral-100 hover:bg-neutral-200'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${isFavorite ? 'text-maroon-700 fill-maroon-700' : 'text-neutral-700'}`}
              />
            </button>
            <button className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5 text-neutral-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Song content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* Song header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-maroon-50 mb-4">
            <span className="text-maroon-800 text-xl" style={{ fontWeight: 600 }}>
              {song.number}
            </span>
          </div>
          <h1 className="text-neutral-900 text-2xl mb-2" style={{ fontWeight: 600, lineHeight: 1.3 }}>
            {song.title}
          </h1>
          {song.subtitle && (
            <p className="text-neutral-600 text-lg" style={{ lineHeight: 1.4 }}>
              {song.subtitle}
            </p>
          )}
        </div>

        {/* Favorite categories badge */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {categories.map(cat => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-maroon-50 border border-maroon-200 text-maroon-800 text-sm"
              >
                <Heart className="w-3.5 h-3.5 fill-maroon-600" />
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Verses */}
        <div className="space-y-8">
          {song.verses.map((verse, index) => (
            <div key={index}>
              {verse.type === 'chorus' || verse.type === 'refrain' ? (
                <div className="bg-maroon-50 rounded-2xl px-6 py-6 border border-maroon-100">
                  <p className="text-maroon-800 uppercase tracking-wide text-xs mb-4" style={{ fontWeight: 600 }}>
                    {verse.type}
                  </p>
                  <div className="space-y-3">
                    {verse.lines.map((line, lineIndex) => (
                      <p
                        key={lineIndex}
                        className="song-text text-neutral-800 text-lg leading-relaxed"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {verse.number && (
                    <p className="text-maroon-700 mb-3 text-sm" style={{ fontWeight: 600 }}>
                      {verse.number}.
                    </p>
                  )}
                  <div className="space-y-3">
                    {verse.lines.map((line, lineIndex) => (
                      <p
                        key={lineIndex}
                        className="song-text text-neutral-800 text-lg leading-relaxed"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action button */}
        <div className="mt-12 pb-8">
          <button
            onClick={() => setShowFavoriteSheet(true)}
            className="w-full bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl px-6 py-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
            style={{ fontWeight: 500 }}
          >
            {isFavorite ? (
              <>
                <Heart className="w-5 h-5 fill-white" />
                Manage Favorites
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add to Favorites
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add to Favorite Sheet */}
      {showFavoriteSheet && (
        <AddToFavoriteSheet
          songId={song.id}
          onClose={() => setShowFavoriteSheet(false)}
        />
      )}
    </div>
  );
}