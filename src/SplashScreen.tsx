import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SplashScreen = () => (
    <View style={styles.container}>
        <View style={styles.topContainer}>
            <Text style={styles.title}>Hymnes et Cantiques</Text>
            <Text style={styles.subtitle}>(Kinyarwanda)</Text>
            <Text style={styles.verse}>1 Corinthiens 14:15</Text>
        </View>
        <View style={styles.bottomContainer}>
            <Text style={styles.credits}>Developed by Marius Ngaboyamahina</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#733752',
        justifyContent: 'space-between',
    },
    topContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 24,
        color: '#fff',
    },
    verse: {
        fontSize: 18,
        color: '#fff',
        marginTop: 25
    },
    credits: {
        fontSize: 14,
        color: '#fff',
    },
});

export default SplashScreen;
