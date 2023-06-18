import { createStackNavigator } from '@react-navigation/stack';
import {useEffect, useState} from "react";
import SongListScreen from './src/SongListScreen';
import SongDetailScreen from './src/SongDetailScreen';
import {NavigationContainer} from "@react-navigation/native";
import SplashScreen from "./src/SplashScreen";

const Stack = createStackNavigator();
export default function App() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate a network request or some loading functionality
        setTimeout(() => {
            setIsLoading(false);
        }, 5000);
    }, []);

    if (isLoading) {
        return <SplashScreen />;
    }
  return (
      <NavigationContainer>
          <Stack.Navigator
              screenOptions={{
                  headerStyle: {
                      backgroundColor: '#733752',
                  },
                  headerTintColor: '#fff', // This will change the color of the header text (back button, title)
                  headerTitleStyle: {
                      fontWeight: 'bold',
                  },
              }}
          >
          <Stack.Screen name="SongList" component={SongListScreen} />
          <Stack.Screen name="SongDetail" component={SongDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}
