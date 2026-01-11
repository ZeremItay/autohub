import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rectangular', width, height, className, ...props }, ref) => {
    const baseStyles = 'animate-pulse bg-gray-200 rounded';
    
    const variants = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components
export const PostCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
    <div className="flex gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </div>
    </div>
  </div>
);

export const UserCardSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex-1 space-y-1">
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="30%" />
    </div>
  </div>
);





