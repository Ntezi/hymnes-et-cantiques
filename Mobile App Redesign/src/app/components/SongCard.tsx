import { useNavigate } from 'react-router';
import { Heart, ChevronRight } from 'lucide-react';
import { Song } from '../types';
import { useApp } from '../context';

interface SongCardProps {
  song: Song;
  compact?: boolean;
}

export function SongCard({ song, compact = false }: SongCardProps) {
  const navigate = useNavigate();
  const { isSongFavorited } = useApp();
  const isFavorite = isSongFavorited(song.id);

  return (
    <button
      onClick={() => navigate(`/song/${song.id}`)}
      className="w-full text-left bg-white hover:bg-neutral-50 rounded-xl px-4 py-3.5 border border-neutral-200 hover:border-maroon-200 transition-all shadow-sm hover:shadow-md group"
    >
      <div className="flex items-center gap-3">
        {/* Song number */}
        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-maroon-50 flex items-center justify-center">
          <span className="text-maroon-800" style={{ fontSize: '16px', fontWeight: 600 }}>
            {song.number}
          </span>
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-neutral-900 truncate mb-0.5"
            style={{ fontSize: compact ? '15px' : '16px', fontWeight: 500 }}
          >
            {song.title}
          </h3>
          {song.subtitle && (
            <p className="text-neutral-500 truncate text-sm">
              {song.subtitle}
            </p>
          )}
        </div>

        {/* Favorite indicator & chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isFavorite && (
            <Heart className="w-4 h-4 text-maroon-600 fill-maroon-600" />
          )}
          <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-maroon-600 transition-colors" />
        </div>
      </div>
    </button>
  );
}
