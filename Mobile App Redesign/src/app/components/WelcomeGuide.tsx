import { useState } from 'react';
import { X, Heart, Search, Hash, Library } from 'lucide-react';

interface WelcomeGuideProps {
  onClose: () => void;
}

export function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Search,
      title: 'Search & Browse',
      description: 'Search for hymns by number or title. Use the quick jump button for fast access.',
    },
    {
      icon: Heart,
      title: 'Organize Favorites',
      description: 'Create custom categories to organize your favorite hymns for different occasions.',
    },
    {
      icon: Library,
      title: 'Multiple Collections',
      description: 'Switch between different collections and languages from the Library tab.',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-maroon-50 flex items-center justify-center">
            <Icon className="w-10 h-10 text-maroon-700" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-neutral-900 text-2xl mb-3" style={{ fontWeight: 600 }}>
            {currentStep.title}
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === step
                  ? 'w-8 bg-maroon-700'
                  : 'w-2 bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl px-6 py-3.5 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl px-6 py-3.5 transition-colors shadow-md"
            style={{ fontWeight: 500 }}
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
