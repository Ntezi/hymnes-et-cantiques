import { useState } from 'react';
import { X, Edit2, Trash2, Check } from 'lucide-react';
import { useApp } from '../context';

interface ManageCategorySheetProps {
  categoryId: string;
  onClose: () => void;
}

export function ManageCategorySheet({ categoryId, onClose }: ManageCategorySheetProps) {
  const { favoriteCategories, renameFavoriteCategory, deleteFavoriteCategory } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const category = favoriteCategories.find(cat => cat.id === categoryId);

  if (!category) {
    onClose();
    return null;
  }

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== category.name) {
      renameFavoriteCategory(categoryId, editName.trim());
    }
    setIsEditing(false);
    setEditName('');
  };

  const handleDelete = () => {
    deleteFavoriteCategory(categoryId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h2 className="text-neutral-900 text-xl" style={{ fontWeight: 600 }}>
            Manage Category
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Delete confirmation */}
          {showDeleteConfirm ? (
            <div className="bg-red-50 rounded-xl p-5 border border-red-200">
              <h3 className="text-neutral-900 mb-2" style={{ fontWeight: 600 }}>
                Delete "{category.name}"?
              </h3>
              <p className="text-neutral-600 text-sm mb-4">
                This will remove the category and all {category.songIds.length} song{category.songIds.length !== 1 ? 's' : ''} from it. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-lg px-4 py-2.5 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg px-4 py-2.5 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isEditing ? (
            /* Edit mode */
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
              <label className="block text-neutral-700 mb-2 text-sm" style={{ fontWeight: 500 }}>
                Category Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={category.name}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="w-full bg-white rounded-lg px-3 py-2.5 mb-4 border border-neutral-200 focus:border-maroon-300 focus:outline-none focus:ring-2 focus:ring-maroon-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRename}
                  disabled={!editName.trim()}
                  className="flex-1 bg-maroon-800 hover:bg-maroon-900 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg px-4 py-2.5 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName('');
                  }}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg px-4 py-2.5 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Action buttons */
            <div className="space-y-3">
              <button
                onClick={() => {
                  setEditName(category.name);
                  setIsEditing(true);
                }}
                className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-maroon-50 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-maroon-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-neutral-900" style={{ fontWeight: 500 }}>
                    Rename Category
                  </p>
                  <p className="text-neutral-500 text-sm">
                    Change the name of this category
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-white hover:bg-red-50 border border-neutral-200 hover:border-red-200 rounded-xl px-5 py-4 flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-destructive" style={{ fontWeight: 500 }}>
                    Delete Category
                  </p>
                  <p className="text-neutral-500 text-sm">
                    Remove this category and all songs
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
