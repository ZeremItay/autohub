'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getCardStyles, combineStyles } from '@/lib/utils/themeStyles';

interface ThemeCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function ThemeCard({
  children,
  className = '',
  variant = 'default',
  rounded = 'xl',
  padding = 'md'
}: ThemeCardProps) {
  const { theme } = useTheme();
  
  const roundedClass = `rounded-${rounded}`;
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[padding];

  return (
    <div className={combineStyles(
      roundedClass,
      getCardStyles(theme, variant),
      paddingClass,
      className
    )}>
      {children}
    </div>
  );
}

