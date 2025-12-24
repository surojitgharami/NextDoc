/**
 * Colors ported from frontend/client/src/index.css
 * Converted to comma-separated HSL strings for React Native compatibility.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#000',
        background: '#fff',
        tint: tintColorLight,
        tabIconDefault: '#ccc',
        tabIconSelected: tintColorLight,

        // Custom App Colors
        primary: 'hsl(217, 91%, 60%)',
        primaryForeground: 'hsl(217, 91%, 98%)',
        secondary: 'hsl(210, 6%, 90%)',
        secondaryForeground: 'hsl(210, 6%, 12%)',
        muted: 'hsl(210, 8%, 94%)',
        mutedForeground: 'hsl(210, 8%, 35%)',
        accent: 'hsl(210, 12%, 92%)',
        accentForeground: 'hsl(210, 12%, 15%)',
        destructive: 'hsl(0, 84%, 48%)',
        destructiveForeground: 'hsl(0, 84%, 98%)',
        border: 'hsl(0, 0%, 91%)',
        input: 'hsl(0, 0%, 75%)',
        card: 'hsl(0, 0%, 98%)',
        cardForeground: 'hsl(0, 0%, 9%)',
    },
    dark: {
        text: '#fff',
        background: '#000',
        tint: tintColorDark,
        tabIconDefault: '#ccc',
        tabIconSelected: tintColorDark,

        // Custom App Colors
        primary: 'hsl(218, 87%, 63%)',
        primaryForeground: 'hsl(218, 87%, 98%)',
        secondary: 'hsl(210, 6%, 18%)',
        secondaryForeground: 'hsl(210, 6%, 92%)',
        muted: 'hsl(210, 8%, 16%)',
        mutedForeground: 'hsl(210, 8%, 68%)',
        accent: 'hsl(210, 12%, 14%)',
        accentForeground: 'hsl(210, 12%, 88%)',
        destructive: 'hsl(0, 84%, 48%)',
        destructiveForeground: 'hsl(0, 84%, 98%)',
        border: 'hsl(0, 0%, 16%)',
        input: 'hsl(0, 0%, 28%)',
        card: 'hsl(0, 0%, 9%)',
        cardForeground: 'hsl(0, 0%, 96%)',
    },
};
