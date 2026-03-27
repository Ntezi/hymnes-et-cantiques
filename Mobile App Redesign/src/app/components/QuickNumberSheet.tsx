import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Search } from 'lucide-react';
import { songs } from '../data';

interface QuickNumberSheetProps {
  onClose: () => void;
}

export function QuickNumberSheet({ onClose }: QuickNumberSheetProps) {
  const navigate = useNavigate();
  const [number, setNumber] = useState('');

  const handleNumberClick = (digit: string) => {
    if (number.length < 3) {
      setNumber(number + digit);
    }
  };

  const handleClear = () => {
    setNumber(number.slice(0, -1));
  };

  const handleGo = () => {
    if (number) {
      const song = songs.find(s => s.number === parseInt(number));
      if (song) {
        navigate(`/song/${song.id}`);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h2 className="text-neutral-900 text-xl" style={{ fontWeight: 600 }}>
            Jump to Song
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Display */}
        <div className="px-6 py-8">
          <div className="bg-neutral-50 rounded-2xl px-6 py-6 mb-6 border border-neutral-200">
            <p className="text-neutral-400 text-sm mb-2">Song Number</p>
            <div className="text-4xl text-neutral-900 h-12 flex items-center" style={{ fontWeight: 600 }}>
              {number || '0'}
            </div>
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
              <button
                key={digit}
                onClick={() => handleNumberClick(digit.toString())}
                className="aspect-square rounded-xl bg-white hover:bg-maroon-50 border border-neutral-200 hover:border-maroon-300 text-neutral-900 text-2xl transition-all active:scale-95 shadow-sm hover:shadow"
                style={{ fontWeight: 500 }}
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="aspect-square rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-600 transition-all active:scale-95"
              style={{ fontWeight: 500 }}
            >
              ←
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="aspect-square rounded-xl bg-white hover:bg-maroon-50 border border-neutral-200 hover:border-maroon-300 text-neutral-900 text-2xl transition-all active:scale-95 shadow-sm hover:shadow"
              style={{ fontWeight: 500 }}
            >
              0
            </button>
            <button
              onClick={handleGo}
              disabled={!number}
              className="aspect-square rounded-xl bg-maroon-800 hover:bg-maroon-900 disabled:bg-neutral-200 disabled:text-neutral-400 text-white transition-all active:scale-95 shadow-md disabled:shadow-none"
              style={{ fontWeight: 500 }}
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
