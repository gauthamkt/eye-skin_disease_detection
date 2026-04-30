import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/common/Card';
import { theme } from '../styles/theme';
import { globalStyles } from '../styles/globalStyles';

const HomeScreen = ({ navigation }) => {
    const menuItems = [
        {
            id: 1,
            title: 'Eye Disease Detection',
            description: 'Analyze retinal images (fundus) for eye conditions such as cataract, glaucoma etc',
            screen: 'EyeDetection',
            gradient: theme.gradients.primary,
        },
        {
            id: 2,
            title: 'Skin Disease Detection',
            description: 'Identify various serious skin conditions using captured skin images',
            screen: 'SkinDetection',
            gradient: theme.gradients.accent,
        },
        {
            id: 3,
            title: 'Color Vision Test',
            description: 'Test for color blindness with Ishihara plates',
            screen: 'ColorVisionTest',
            gradient: theme.gradients.purple,
        },
        {
            id: 4,
            title: 'Test History',
            description: 'View all your previous test results',
            screen: 'History',
            gradient: theme.gradients.success,
        },
    ];

    return (
        <LinearGradient
            colors={theme.gradients.background}
            style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <Text style={styles.appTitle}>EyeDetect</Text>
                    <Text style={styles.appSubtitle}>
                        Early Detection for Better Health
                    </Text>
                </View>

                <View style={styles.menuGrid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate(item.screen)}
                            style={styles.menuItemContainer}>
                            <LinearGradient
                                colors={item.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.menuItem}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuDescription}>{item.description}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                <Card variant="glass" style={styles.infoCard}>
                    <Text style={styles.infoTitle}>About EyeDetect</Text>
                    <Text style={styles.infoText}>
                        EyeDetect uses advanced deep learning models to help detect eye and skin conditions early.
                        All processing happens on your device for privacy and works offline.
                    </Text>
                    <Text style={styles.infoDisclaimer}>
                        This app is for screening purposes only. Always consult a healthcare
                        professional for diagnosis and treatment.
                    </Text>
                </Card>

            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    header: {
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    appTitle: {
        fontSize: theme.typography.fontSize.xxxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    appSubtitle: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    menuGrid: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    menuItemContainer: {
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    menuItem: {
        padding: theme.spacing.xl,
        minHeight: 140,
        justifyContent: 'center',
    },

    menuTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    menuDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textPrimary,
        opacity: 0.9,
    },
    infoCard: {
        marginTop: theme.spacing.md,
    },
    infoTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    infoText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.fontSize.sm * 1.5,
        marginBottom: theme.spacing.md,
    },
    infoDisclaimer: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.warning,
        lineHeight: theme.typography.fontSize.xs * 1.5,
        fontStyle: 'italic',
    },
});

export default HomeScreen;
