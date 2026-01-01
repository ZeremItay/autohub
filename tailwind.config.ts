import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        'dark-bg': {
          DEFAULT: '#0a0e27',
          light: '#1a1f3a',
          lighter: '#2a2f4a',
        },
        'dark-purple': {
          DEFAULT: '#1a0b2e',
          light: '#2d1b4e',
          lighter: '#3d2b5e',
        },
        'hot-pink': {
          DEFAULT: '#ec4899',
          light: '#f472b6',
          dark: '#db2777',
          glow: 'rgba(236, 72, 153, 0.3)',
        },
        'neon-cyan': {
          DEFAULT: '#00f5ff',
          light: '#33f7ff',
          dark: '#00d4e0',
          glow: 'rgba(0, 245, 255, 0.3)',
        },
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #0a0e27 0%, #1a0b2e 50%, #2d1b4e 100%)',
        'dark-gradient-alt': 'linear-gradient(135deg, #1a0b2e 0%, #0a0e27 50%, #1a1f3a 100%)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' }, // Moving Right for Hebrew/RTL
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)' },
        },
        'glow-cyan': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 245, 255, 0.5)' },
        },
        magicMove: {
          '0%': { 
            transform: 'translateX(-100%) translateY(-100%)',
            opacity: '0',
          },
          '50%': {
            opacity: '1',
          },
          '100%': { 
            transform: 'translateX(100%) translateY(100%)',
            opacity: '0',
          },
        },
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        glow: 'glow 2s ease-in-out infinite',
        'glow-cyan': 'glow-cyan 2s ease-in-out infinite',
        'magic-move': 'magicMove 3s ease-in-out infinite',
      },
      borderRadius: {
        'pill': '9999px',
      },
    },
  },
  plugins: [],
};

export default config;

