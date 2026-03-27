import { useNavigate } from 'react-router';
import { Check, ChevronRight, Book } from 'lucide-react';
import { useApp } from '../context';
import { collections } from '../data';
import { BottomNav } from '../components/BottomNav';

export function CollectionsScreen() {
  const navigate = useNavigate();
  const { currentCollection, setCurrentCollection } = useApp();

  const handleSelectCollection = (collectionId: string) => {
    setCurrentCollection(collectionId);
    navigate('/home');
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-25">
      {/* Header */}
      <div className="bg-gradient-to-b from-maroon-800 to-maroon-700 px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Book className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl" style={{ fontWeight: 600 }}>
              Collections
            </h1>
            <p className="text-maroon-100 text-sm">
              Choose your hymn collection
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 pb-24">
        <div className="space-y-3">
          {collections.map(collection => {
            const isActive = currentCollection === collection.id;
            
            return (
              <button
                key={collection.id}
                onClick={() => handleSelectCollection(collection.id)}
                className={`w-full text-left rounded-2xl px-5 py-5 transition-all shadow-sm hover:shadow-md border ${
                  isActive
                    ? 'bg-maroon-50 border-maroon-300 ring-2 ring-maroon-200'
                    : 'bg-white border-neutral-200 hover:border-maroon-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-maroon-700' : 'bg-neutral-100'
                  }`}>
                    <Book className={`w-6 h-6 ${isActive ? 'text-white' : 'text-neutral-600'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`mb-1 ${isActive ? 'text-maroon-900' : 'text-neutral-900'}`}
                      style={{ fontSize: '17px', fontWeight: 600 }}
                    >
                      {collection.name}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-2">
                      {collection.language}
                    </p>
                    <p className="text-neutral-500 text-sm">
                      {collection.songCount} songs
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {isActive ? (
                      <div className="w-6 h-6 rounded-full bg-maroon-700 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-300" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info section */}
        <div className="mt-8 bg-maroon-50 rounded-xl p-5 border border-maroon-200">
          <h3 className="text-maroon-900 mb-2" style={{ fontWeight: 600 }}>
            About Collections
          </h3>
          <p className="text-neutral-700 text-sm leading-relaxed">
            Each collection contains hymns and songs in different languages. Switch between collections to access songs in your preferred language.
          </p>
        </div>
      </div>

      <BottomNav active="collections" />
    </div>
  );
}
