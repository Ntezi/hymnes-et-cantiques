import { useState } from 'react';
import { X, Plus, Check, Heart, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../context';

interface AddToFavoriteSheetProps {
  songId: string;
  onClose: () => void;
}

export function AddToFavoriteSheet({ songId, onClose }: AddToFavoriteSheetProps) {
  const {
    favoriteCategories,
    createFavoriteCategory,
    addSongToCategory,
    removeSongFromCategory,
    getSongCategories,
  } = useApp();
  
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const songCategories = getSongCategories(songId);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createFavoriteCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    const isInCategory = songCategories.some(cat => cat.id === categoryId);
    if (isInCategory) {
      removeSongFromCategory(categoryId, songId);
    } else {
      addSongToCategory(categoryId, songId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h2 className="text-neutral-900 text-xl" style={{ fontWeight: 600 }}>
            Add to Favorites
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* New category input */}
          {showNewCategory ? (
            <div className="mb-4 bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                className="w-full bg-white rounded-lg px-3 py-2.5 mb-3 border border-neutral-200 focus:border-maroon-300 focus:outline-none focus:ring-2 focus:ring-maroon-100"
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
              className="w-full mb-4 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 text-maroon-800 rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          )}

          {/* Category list */}
          {favoriteCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                <Heart className="w-7 h-7 text-neutral-400" />
              </div>
              <p className="text-neutral-500">
                No categories yet. Create one to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {favoriteCategories.map(category => {
                const isSelected = songCategories.some(cat => cat.id === category.id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.id)}
                    className={`w-full text-left rounded-xl px-4 py-4 flex items-center gap-3 transition-all border ${
                      isSelected
                        ? 'bg-maroon-50 border-maroon-300 shadow-sm'
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-maroon-700 border-maroon-700'
                          : 'border-neutral-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate ${
                          isSelected ? 'text-maroon-900' : 'text-neutral-900'
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        {category.name}
                      </p>
                      <p className="text-neutral-500 text-sm">
                        {category.songIds.length} {category.songIds.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>

                    <Heart
                      className={`w-5 h-5 flex-shrink-0 transition-all ${
                        isSelected
                          ? 'text-maroon-700 fill-maroon-700'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
