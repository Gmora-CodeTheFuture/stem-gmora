import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            colors: {
                // Navy / Blue Primary
                primary: {
                    50:  '#eef2ff',
                    100: '#dbe4ff',
                    200: '#bac8ff',
                    300: '#91a7ff',
                    400: '#748ffc',
                    500: '#5c7cfa',
                    600: '#4c6ef5',
                    700: '#4263eb',
                    800: '#3b5bdb',
                    900: '#364fc7',
                    950: '#1e3a8a',
                },
                // Teal Accent
                accent: {
                    50:  '#e6fcf5',
                    100: '#c3fae8',
                    200: '#96f2d7',
                    300: '#63e6be',
                    400: '#38d9a9',
                    500: '#20c997',
                    600: '#12b886',
                    700: '#0ca678',
                    800: '#099268',
                    900: '#087f5b',
                    950: '#065f46',
                },
                // Violet secondary
                violet: {
                    50:  '#f3f0ff',
                    100: '#e5dbff',
                    200: '#d0bfff',
                    300: '#b197fc',
                    400: '#9775fa',
                    500: '#845ef7',
                    600: '#7950f2',
                    700: '#7048e8',
                    800: '#6741d9',
                    900: '#5f3dc4',
                    950: '#4c1d95',
                },
                // Surface / Background shades
                surface: {
                    50:  '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },

            fontFamily: {
                sans: ['Inter', 'Outfit', ...defaultTheme.fontFamily.sans],
                display: ['Outfit', 'Inter', ...defaultTheme.fontFamily.sans],
                mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
            },

            borderRadius: {
                'xl':  '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
            },

            boxShadow: {
                'glow':     '0 0 20px rgba(92, 124, 250, 0.3)',
                'glow-lg':  '0 0 40px rgba(92, 124, 250, 0.2)',
                'glow-accent': '0 0 20px rgba(32, 201, 151, 0.3)',
                'glass':    '0 8px 32px rgba(0, 0, 0, 0.12)',
            },

            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'hero-gradient': 'linear-gradient(135deg, #1e3a8a 0%, #4c6ef5 50%, #7048e8 100%)',
                'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            },

            animation: {
                'fade-in':      'fadeIn 0.5s ease-out',
                'slide-up':     'slideUp 0.5s ease-out',
                'slide-down':   'slideDown 0.3s ease-out',
                'scale-in':     'scaleIn 0.3s ease-out',
                'float':        'float 6s ease-in-out infinite',
                'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
                'shimmer':      'shimmer 2s linear infinite',
            },

            keyframes: {
                fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp:   { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                slideDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                scaleIn:   { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
                float:     { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
                pulseGlow: { '0%, 100%': { boxShadow: '0 0 20px rgba(92, 124, 250, 0.3)' }, '50%': { boxShadow: '0 0 30px rgba(92, 124, 250, 0.5)' } },
                shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
            },
        },
    },

    plugins: [forms],
};
