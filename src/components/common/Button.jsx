import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../styles/theme';

const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    icon = null,
    style,
}) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return theme.gradients.primary;
            case 'accent':
                return theme.gradients.accent;
            case 'success':
                return theme.gradients.success;
            default:
                return theme.gradients.primary;
        }
    };

    const getButtonSize = () => {
        switch (size) {
            case 'small':
                return {
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    fontSize: theme.typography.fontSize.sm,
                };
            case 'large':
                return {
                    paddingVertical: theme.spacing.lg,
                    paddingHorizontal: theme.spacing.xl,
                    fontSize: theme.typography.fontSize.lg,
                };
            default:
                return {
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    fontSize: theme.typography.fontSize.md,
                };
        }
    };

    const buttonSize = getButtonSize();
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={[styles.container, style]}>
            <LinearGradient
                colors={isDisabled ? ['#4A5568', '#2D3748'] : getGradientColors()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.gradient,
                    {
                        paddingVertical: buttonSize.paddingVertical,
                        paddingHorizontal: buttonSize.paddingHorizontal,
                    },
                ]}>
                {loading ? (
                    <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                    <View style={styles.content}>
                        {icon && <View style={styles.icon}>{icon}</View>}
                        <Text
                            style={[
                                styles.text,
                                { fontSize: buttonSize.fontSize },
                                isDisabled && styles.disabledText,
                            ]}>
                            {title}
                        </Text>
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    gradient: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: theme.spacing.sm,
    },
    text: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    disabledText: {
        opacity: 0.5,
    },
});

export default Button;
