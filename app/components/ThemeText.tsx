'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getTextStyles, combineStyles } from '@/lib/utils/themeStyles';

interface ThemeTextProps {
  children: React.ReactNode;
  variant?: 'default' | 'heading' | 'subheading' | 'muted' | 'accent';
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export default function ThemeText({
  children,
  variant = 'default',
  className = '',
  as: Component = 'p'
}: ThemeTextProps) {
  const { theme } = useTheme();

  return (
    <Component className={combineStyles(getTextStyles(theme, variant), className)}>
      {children}
    </Component>
  );
}

