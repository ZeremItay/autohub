'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getButtonRoundedStyles, combineStyles } from '@/lib/utils/themeStyles';

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function ThemeButton({
  variant = 'primary',
  rounded = 'lg',
  className = '',
  children,
  ...props
}: ThemeButtonProps) {
  const { theme } = useTheme();

  return (
    <button
      className={combineStyles(
        getButtonRoundedStyles(theme, variant, rounded),
        'font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

