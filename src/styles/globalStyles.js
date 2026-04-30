import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },

    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },

    scrollContainer: {
        flexGrow: 1,
        backgroundColor: theme.colors.background,
    },

    glassCard: {
        backgroundColor: theme.colors.glassBackground,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    // Text styles
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },

    subtitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },

    bodyText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.normal,
    },

    caption: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textTertiary,
    },
});
