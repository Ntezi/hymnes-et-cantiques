import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Heart, Plus, Edit2, Trash2, MoreVertical, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { songs } from '../data';
import { BottomNav } from '../components/BottomNav';
import { ManageCategorySheet } from '../components/ManageCategorySheet';

export function FavoritesScreen() {
  const navigate = useNavigate();
  const { favoriteCategories, createFavoriteCategory } = useApp();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [managingCategoryId, setManagingCategoryId] = useState<string | null>(null);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createFavoriteCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-25">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-neutral-100">
        <h1 className="text-neutral-900 text-2xl mb-1" style={{ fontWeight: 600 }}>
          Favorites
        </h1>
        <p className="text-neutral-500 text-sm">
          Organize your favorite hymns
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 pb-24">
        {/* New category input */}
        {showNewCategory ? (
          <div className="mb-5 bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              className="w-full bg-neutral-50 rounded-lg px-3 py-2.5 mb-3 border border-neutral-200 focus:border-maroon-300 focus:outline-none focus:ring-2 focus:ring-maroon-100"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 bg-maroon-800 hover:bg-maroon-900 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCategory(true)}
            className="w-full mb-5 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl px-5 py-4 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-5 h-5" />
            New Category
          </button>
        )}

        {/* Categories */}
        {favoriteCategories.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-maroon-50 mb-5">
              <Heart className="w-9 h-9 text-maroon-300" />
            </div>
            <h2 className="text-neutral-900 text-lg mb-2" style={{ fontWeight: 600 }}>
              No favorites yet
            </h2>
            <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">
              Create categories to organize your favorite hymns and songs
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteCategories.map(category => {
              const categorySongs = category.songIds
                .map(id => songs.find(s => s.id === id))
                .filter(Boolean);

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                >
                  {/* Category header */}
                  <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-neutral-900 mb-0.5 truncate" style={{ fontSize: '17px', fontWeight: 600 }}>
                        {category.name}
                      </h3>
                      <p className="text-neutral-500 text-sm">
                        {category.songIds.length} {category.songIds.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                    <button
                      onClick={() => setManagingCategoryId(category.id)}
                      className="w-9 h-9 rounded-lg bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                    >
                      <MoreVertical className="w-4.5 h-4.5 text-neutral-600" />
                    </button>
                  </div>

                  {/* Category songs */}
                  {categorySongs.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-neutral-400 text-sm">
                        No songs in this category
                      </p>
                    </div>
                  ) : (
                    <div>
                      {categorySongs.slice(0, 3).map(song => (
                        song && (
                          <button
                            key={song.id}
                            onClick={() => navigate(`/song/${song.id}`)}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                          >
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-maroon-50 flex items-center justify-center">
                              <span className="text-maroon-800 text-sm" style={{ fontWeight: 600 }}>
                                {song.number}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-neutral-900 truncate text-sm" style={{ fontWeight: 500 }}>
                                {song.title}
                              </p>
                            </div>
                            <ChevronRight className="w-4.5 h-4.5 text-neutral-300 flex-shrink-0" />
                          </button>
                        )
                      ))}
                      {categorySongs.length > 3 && (
                        <div className="px-5 py-2.5 text-center">
                          <span className="text-neutral-500 text-xs">
                            +{categorySongs.length - 3} more
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="favorites" />

      {/* Manage Category Sheet */}
      {managingCategoryId && (
        <ManageCategorySheet
          categoryId={managingCategoryId}
          onClose={() => setManagingCategoryId(null)}
        />
      )}
    </div>
  );
}
