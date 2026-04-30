export const theme = {
    colors: {
        // Primary palette - Medical/Health themed
        primary: '#4A90E2',
        primaryDark: '#2E5C8A',
        primaryLight: '#7AB8FF',

        // Accent colors
        accent: '#00D9FF',
        accentGreen: '#00E676',
        accentPurple: '#B388FF',

        // Status colors
        success: '#00E676',
        warning: '#FFD54F',
        error: '#FF5252',
        info: '#4A90E2',

        // Neutrals
        background: '#0F0F1E',
        backgroundLight: '#1A1A2E',
        surface: '#16213E',
        surfaceLight: '#1F2D4D',

        // Text
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B8C8',
        textTertiary: '#6B7280',

        // Borders & Dividers
        border: '#2D3748',
        divider: '#1F2937',

        // Glassmorphism
        glassBackground: 'rgba(255, 255, 255, 0.05)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
    },

    gradients: {
        primary: ['#4A90E2', '#2E5C8A'],
        accent: ['#00D9FF', '#4A90E2'],
        success: ['#00E676', '#00C853'],
        purple: ['#B388FF', '#7C4DFF'],
        background: ['#0F0F1E', '#1A1A2E'],
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 9999,
    },

    typography: {
        fontFamily: {
            regular: 'System',
            medium: 'System',
            bold: 'System',
        },
        fontSize: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 24,
            xxl: 32,
            xxxl: 40,
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        },
    },

    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
        },
        glow: {
            shadowColor: '#4A90E2',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 6,
        },
    },

    animations: {
        duration: {
            fast: 150,
            normal: 300,
            slow: 500,
        },
    },
};
