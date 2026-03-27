import { useNavigate } from 'react-router';
import { Home, Heart, Library, Search } from 'lucide-react';

interface BottomNavProps {
  active: 'home' | 'search' | 'favorites' | 'collections';
}

export function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/home' },
    { id: 'search', icon: Search, label: 'Search', path: '/search' },
    { id: 'favorites', icon: Heart, label: 'Favorites', path: '/favorites' },
    { id: 'collections', icon: Library, label: 'Library', path: '/collections' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors"
              >
                <Icon
                  className={`w-6 h-6 mb-1 transition-colors ${
                    isActive ? 'text-maroon-700' : 'text-neutral-400'
                  }`}
                  fill={isActive && item.id === 'favorites' ? 'currentColor' : 'none'}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? 'text-maroon-700' : 'text-neutral-500'
                  }`}
                  style={{ fontWeight: isActive ? 500 : 400 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
