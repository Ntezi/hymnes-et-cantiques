import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from "react";
import SongListScreen from './src/SongListScreen';
import SongDetailScreen from './src/SongDetailScreen';
import { NavigationContainer } from "@react-navigation/native";
import SplashScreen from "./src/SplashScreen";
import FavoriteSongsScreen from "./src/FavoriteSongsScreen";
import RecentScreen from './src/RecentScreen';
import CollectionsScreen from './src/CollectionsScreen';
import { useKeepAwake } from 'expo-keep-awake';
import Icon from 'react-native-vector-icons/Ionicons';
import { AppStateProvider } from './src/appState';

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
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
		fontWeight: '600' as const,
	},
};

const MainTabsNavigator = () => (
	<Tab.Navigator
		screenOptions={({ route }) => ({
			...stackScreenOptions,
			tabBarActiveTintColor: '#6d3549',
			tabBarInactiveTintColor: '#999999',
			tabBarStyle: {
				backgroundColor: '#ffffff',
				borderTopColor: '#e6e6e6',
				borderTopWidth: 1,
				height: 64,
				paddingTop: 6,
				paddingBottom: 6,
			},
			tabBarLabelStyle: {
				fontSize: 11,
				fontWeight: '600',
				marginBottom: 2,
			},
			tabBarIcon: ({ color, size, focused }) => {
				let iconName = 'ellipse-outline';
				if (route.name === 'Home') {
					iconName = focused ? 'home' : 'home-outline';
				} else if (route.name === 'Recent') {
					iconName = focused ? 'time' : 'time-outline';
				} else if (route.name === 'Favorites') {
					iconName = focused ? 'heart' : 'heart-outline';
				} else if (route.name === 'Library') {
					iconName = focused ? 'book' : 'book-outline';
				}

				return (
					<Icon
						name={iconName}
						size={size}
						color={color}
					/>
				);
			},
		})}
	>
		<Tab.Screen
			name="Home"
			component={SongListScreen}
			options={{ title: 'Home' }}
		/>
		<Tab.Screen
			name="Recent"
			component={RecentScreen}
			options={{ title: 'Recent' }}
		/>
		<Tab.Screen
			name="Favorites"
			component={FavoriteSongsScreen}
			options={{ title: 'Favorites' }}
		/>
		<Tab.Screen
			name="Library"
			component={CollectionsScreen}
			options={{ title: 'Library' }}
		/>
	</Tab.Navigator>
);

export default function App() {
	useKeepAwake();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 2500);

		return () => clearTimeout(timer);
	}, []);

	if (isLoading) {
		return <SplashScreen />;
	}

	return (
		<AppStateProvider>
			<NavigationContainer>
				<RootStack.Navigator screenOptions={stackScreenOptions}>
					<RootStack.Screen
						name="MainTabs"
						component={MainTabsNavigator}
						options={{ headerShown: false }}
					/>
					<RootStack.Screen name="SongDetail" component={SongDetailScreen} />
				</RootStack.Navigator>
			</NavigationContainer>
		</AppStateProvider>
	);
}
