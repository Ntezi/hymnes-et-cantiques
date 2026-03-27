import { Outlet } from 'react-router';
import { AppProvider } from '../context';

export function RootLayout() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <div className="w-full max-w-md min-h-screen bg-white shadow-2xl relative">
          <Outlet />
        </div>
      </div>
    </AppProvider>
  );
}