import { createBrowserRouter } from 'react-router';
import { RootLayout } from './screens/RootLayout';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SongDetailScreen } from './screens/SongDetailScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { CollectionsScreen } from './screens/CollectionsScreen';
import { SearchScreen } from './screens/SearchScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <SplashScreen />,
      },
      {
        path: 'home',
        element: <HomeScreen />,
      },
      {
        path: 'song/:songId',
        element: <SongDetailScreen />,
      },
      {
        path: 'favorites',
        element: <FavoritesScreen />,
      },
      {
        path: 'collections',
        element: <CollectionsScreen />,
      },
      {
        path: 'search',
        element: <SearchScreen />,
      },
    ],
  },
]);
