'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}


