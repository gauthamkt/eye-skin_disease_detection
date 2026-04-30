import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

const Card = ({ children, variant = 'default', style }) => {
    const getCardStyle = () => {
        switch (variant) {
            case 'glass':
                return styles.glassCard;
            case 'elevated':
                return styles.elevatedCard;
            default:
                return styles.defaultCard;
        }
    };

    return (
        <View style={[getCardStyle(), style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    defaultCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },
    glassCard: {
        backgroundColor: theme.colors.glassBackground,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    elevatedCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.lg,
    },
});

export default Card;
