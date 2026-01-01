'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getInputStyles, combineStyles } from '@/lib/utils/themeStyles';

interface ThemeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export default function ThemeInput({
  hasError = false,
  className = '',
  ...props
}: ThemeInputProps) {
  const { theme } = useTheme();

  return (
    <input
      className={combineStyles(
        getInputStyles(theme, hasError),
        className
      )}
      {...props}
    />
  );
}

