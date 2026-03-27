import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Book } from 'lucide-react';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-maroon-800 to-maroon-900 px-6 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
          <Book className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl tracking-tight text-white mb-2" style={{ fontWeight: 600 }}>
          Hymnes et Cantiques
        </h1>
        <p className="text-maroon-100" style={{ fontSize: '15px' }}>
          Kinyarwanda
        </p>
      </div>

      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-maroon-200 text-xs">
          1 Corinthiens 14:15
        </p>
        <p className="text-white/60 text-xs mt-6">
          Developed by Marius Ngaboyamahina
        </p>
      </div>
    </div>
  );
}
