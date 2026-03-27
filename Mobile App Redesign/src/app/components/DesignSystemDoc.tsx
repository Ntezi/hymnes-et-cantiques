import { X } from 'lucide-react';

interface DesignSystemDocProps {
  onClose: () => void;
}

export function DesignSystemDoc({ onClose }: DesignSystemDocProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl text-neutral-900" style={{ fontWeight: 600 }}>
            Design System
          </h1>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* Colors */}
        <section className="mb-12">
          <h2 className="text-2xl text-neutral-900 mb-6" style={{ fontWeight: 600 }}>
            Color Palette
          </h2>
          
          <div className="mb-8">
            <h3 className="text-lg text-neutral-700 mb-4" style={{ fontWeight: 600 }}>
              Maroon Primary
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { name: '900', color: 'bg-maroon-900' },
                { name: '800', color: 'bg-maroon-800' },
                { name: '700', color: 'bg-maroon-700' },
                { name: '600', color: 'bg-maroon-600' },
                { name: '500', color: 'bg-maroon-500' },
                { name: '400', color: 'bg-maroon-400' },
                { name: '300', color: 'bg-maroon-300' },
                { name: '200', color: 'bg-maroon-200' },
                { name: '100', color: 'bg-maroon-100' },
                { name: '50', color: 'bg-maroon-50' },
              ].map(shade => (
                <div key={shade.name} className="text-center">
                  <div className={`${shade.color} h-16 rounded-lg border border-neutral-200 shadow-sm mb-2`} />
                  <p className="text-xs text-neutral-600">{shade.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg text-neutral-700 mb-4" style={{ fontWeight: 600 }}>
              Neutral Grays
            </h3>
            <div className="grid grid-cols-6 gap-3">
              {[
                { name: '900', color: 'bg-neutral-900' },
                { name: '700', color: 'bg-neutral-700' },
                { name: '500', color: 'bg-neutral-500' },
                { name: '300', color: 'bg-neutral-300' },
                { name: '100', color: 'bg-neutral-100' },
                { name: '50', color: 'bg-neutral-50' },
              ].map(shade => (
                <div key={shade.name} className="text-center">
                  <div className={`${shade.color} h-16 rounded-lg border border-neutral-200 shadow-sm mb-2`} />
                  <p className="text-xs text-neutral-600">{shade.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h2 className="text-2xl text-neutral-900 mb-6" style={{ fontWeight: 600 }}>
            Typography
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-2">Headings - Inter</p>
              <h1 className="text-neutral-900">Heading 1</h1>
              <h2 className="text-neutral-900">Heading 2</h2>
              <h3 className="text-neutral-900">Heading 3</h3>
            </div>
            
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-2">Song Text - Crimson Pro</p>
              <p className="song-text text-lg text-neutral-800 leading-relaxed">
                Turagusingiza Data,<br />
                Wow'utuye mu mucyo mwinshi,<br />
                Urondora ibiyo mu ijuru.
              </p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="mb-12">
          <h2 className="text-2xl text-neutral-900 mb-6" style={{ fontWeight: 600 }}>
            Components
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg text-neutral-700 mb-3" style={{ fontWeight: 600 }}>
                Buttons
              </h3>
              <div className="flex flex-wrap gap-3">
                <button className="bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl px-6 py-3 transition-all">
                  Primary
                </button>
                <button className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl px-6 py-3 transition-all">
                  Secondary
                </button>
                <button className="bg-white border border-neutral-200 hover:border-maroon-300 text-neutral-900 rounded-xl px-6 py-3 transition-all">
                  Outline
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-neutral-700 mb-3" style={{ fontWeight: 600 }}>
                Cards
              </h3>
              <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm">
                <h4 className="text-neutral-900 mb-2">Card Title</h4>
                <p className="text-neutral-600 text-sm">
                  Card content with rounded corners, subtle borders, and shadows
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="mb-12">
          <h2 className="text-2xl text-neutral-900 mb-6" style={{ fontWeight: 600 }}>
            Spacing & Borders
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-32 text-neutral-600 text-sm">Border Radius</div>
              <div className="flex-1 flex gap-3">
                <div className="w-16 h-16 bg-maroon-100 border-2 border-maroon-300 rounded-lg" />
                <div className="w-16 h-16 bg-maroon-100 border-2 border-maroon-300 rounded-xl" />
                <div className="w-16 h-16 bg-maroon-100 border-2 border-maroon-300 rounded-2xl" />
                <div className="w-16 h-16 bg-maroon-100 border-2 border-maroon-300 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 text-neutral-600 text-sm">Shadows</div>
              <div className="flex-1 flex gap-3">
                <div className="w-16 h-16 bg-white shadow-sm rounded-lg" />
                <div className="w-16 h-16 bg-white shadow-md rounded-lg" />
                <div className="w-16 h-16 bg-white shadow-lg rounded-lg" />
                <div className="w-16 h-16 bg-white shadow-xl rounded-lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Usage Notes */}
        <section>
          <h2 className="text-2xl text-neutral-900 mb-6" style={{ fontWeight: 600 }}>
            Usage Guidelines
          </h2>
          
          <div className="space-y-4">
            <div className="bg-maroon-50 rounded-lg p-4 border border-maroon-200">
              <h4 className="text-maroon-900 mb-2" style={{ fontWeight: 600 }}>
                Sacred & Warm
              </h4>
              <p className="text-neutral-700 text-sm">
                The maroon palette creates a sacred, church-like atmosphere while remaining modern and approachable.
              </p>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              <h4 className="text-neutral-900 mb-2" style={{ fontWeight: 600 }}>
                Readable & Accessible
              </h4>
              <p className="text-neutral-700 text-sm">
                Crimson Pro serif font for lyrics ensures comfortable long-form reading. High contrast ratios meet WCAG standards.
              </p>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              <h4 className="text-neutral-900 mb-2" style={{ fontWeight: 600 }}>
                Touch-Friendly
              </h4>
              <p className="text-neutral-700 text-sm">
                All interactive elements are at least 44×44px for easy thumb navigation on mobile devices.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
