'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  rounded?: 'lg' | 'xl' | '2xl' | '3xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function GlassCard({ 
  children, 
  className = '', 
  rounded = '2xl',
  padding = 'md'
}: GlassCardProps) {
  const roundedClass = `rounded-${rounded}`;
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[padding];

  return (
    <div className={`glass-card ${roundedClass} shadow-sm ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

