'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';

export type Theme = 'neon' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with 'neon' for SSR, will be updated on client
  const [theme, setThemeState] = useState<Theme>('neon');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && (savedTheme === 'neon' || savedTheme === 'light')) {
        setThemeState(savedTheme);
      }
      setMounted(true);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      const body = document.body;
      
      // Remove both theme classes
      html.classList.remove('theme-neon', 'theme-light');
      body.classList.remove('theme-neon', 'theme-light');
      
      // Add current theme class
      html.classList.add(`theme-${theme}`);
      body.classList.add(`theme-${theme}`);
      
      // Save to localStorage
      if (mounted) {
        localStorage.setItem('theme', theme);
      }
    }
  }, [theme, mounted]);

  // Memoize toggleTheme to prevent unnecessary re-renders
  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'neon' ? 'light' : 'neon');
  }, []);

  // Memoize setTheme to prevent unnecessary re-renders
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme
  }), [theme, toggleTheme, setTheme]);

  // Always provide context, even before mount to prevent errors
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

