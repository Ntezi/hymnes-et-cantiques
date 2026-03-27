import { createStackNavigator } from '@react-navigation/stack';
import {useEffect, useState} from "react";
import SongListScreen from './src/SongListScreen';
import SongDetailScreen from './src/SongDetailScreen';
import {NavigationContainer} from "@react-navigation/native";
import SplashScreen from "./src/SplashScreen";
import FavoriteSongsScreen from "./src/FavoriteSongsScreen";
import { useKeepAwake } from 'expo-keep-awake';

const Stack = createStackNavigator();
export default function App() {
    useKeepAwake();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setIsLoading(false);
        }, 2500);
    }, []);

    if (isLoading) {
        return <SplashScreen />;
    }
  return (
      <NavigationContainer>
          <Stack.Navigator
              screenOptions={{
                  headerStyle: {
                      backgroundColor: '#6d3549',
                      elevation: 0,
                      shadowOpacity: 0,
                  },
                  cardStyle: {
                      backgroundColor: '#fafafa',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                      fontWeight: '600',
                  },
              }}
          >
          <Stack.Screen name="SongList" component={SongListScreen} />
          <Stack.Screen name="SongDetail" component={SongDetailScreen} />
          <Stack.Screen name="FavoriteSongs" component={FavoriteSongsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}
