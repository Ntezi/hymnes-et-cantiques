import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SplashScreen = () => (
    <View style={styles.container}>
        <View style={styles.topContainer}>
            <View style={styles.iconCard}>
                <Icon name="book-outline" size={42} color="#ffffff" />
            </View>
            <Text style={styles.title}>Hymnes et Cantiques</Text>
            <Text style={styles.subtitle}>Kinyarwanda</Text>
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
        backgroundColor: '#6d3549',
        justifyContent: 'space-between',
    },
    topContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconCard: {
        width: 94,
        height: 94,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    bottomContainer: {
        marginBottom: 28,
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#e4c2cf',
        marginTop: 6,
    },
    verse: {
        fontSize: 14,
        color: '#f5e0e9',
        marginTop: 22,
    },
    credits: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.72)',
    },
});

export default SplashScreen;
