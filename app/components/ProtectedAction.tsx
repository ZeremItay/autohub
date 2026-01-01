'use client';

import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Lock, LogIn } from 'lucide-react';
import Link from 'next/link';

interface ProtectedActionProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePremium?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  disabledMessage?: string;
  redirectTo?: string;
  className?: string;
}

export default function ProtectedAction({
  children,
  requireAuth = false,
  requirePremium = false,
  onClick,
  disabledMessage,
  redirectTo = '/auth/login',
  className = ''
}: ProtectedActionProps) {
  const router = useRouter();
  const { user, loading, isPremium } = useCurrentUser();
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Show loading state
  if (loading) {
    return (
      <div className={`${className} opacity-50 cursor-not-allowed`}>
        {children}
      </div>
    );
  }

  // Helper function to show tooltip with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(true);
  };

  // Helper function to hide tooltip with delay
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200); // 200ms delay before hiding
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check authentication requirement
  if (requireAuth && !user) {
    const message = disabledMessage || 'עליך להתחבר לאתר כדי לצפות בתוכן';
    
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {React.isValidElement(children) ? (
          React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(true);
            },
            disabled: true,
            className: `${(children as any).props?.className || ''} opacity-50 cursor-not-allowed pointer-events-none`.trim()
          })
        ) : (
          <div className="opacity-50 cursor-not-allowed pointer-events-none">
            {children}
          </div>
        )}
        
        {showTooltip && (
          <div 
            ref={tooltipRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 glass-card border border-hot-pink/30 text-white text-sm rounded-xl p-4 shadow-xl z-50 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0 text-hot-pink" />
              <div className="flex-1">
                <p className="font-medium mb-3 text-white">{message}</p>
                <Link
                  href={redirectTo}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LogIn className="w-4 h-4" />
                  <span>התחבר</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-[#1e293b] border-r border-b border-hot-pink/30 rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check premium requirement
  // First check if user is not logged in - show auth message
  if (requirePremium && !user) {
    const message = disabledMessage || 'עליך להתחבר לאתר כדי לצפות בתוכן';
    
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {React.isValidElement(children) ? (
          React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(true);
            },
            disabled: true,
            className: `${(children as any).props?.className || ''} opacity-50 cursor-not-allowed pointer-events-none`.trim()
          })
        ) : (
          <div className="opacity-50 cursor-not-allowed pointer-events-none">
            {children}
          </div>
        )}
        
        {showTooltip && (
          <div 
            ref={tooltipRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 glass-card border border-hot-pink/30 text-white text-sm rounded-xl p-4 shadow-xl z-50 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0 text-hot-pink" />
              <div className="flex-1">
                <p className="font-medium mb-3 text-white">{message}</p>
                <Link
                  href={redirectTo}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LogIn className="w-4 h-4" />
                  <span>התחבר</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-[#1e293b] border-r border-b border-hot-pink/30 rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // User is logged in but not premium
  if (requirePremium && user && !isPremium) {
    const message = disabledMessage || 'צריך לשדרג לפרימיום כדי לצפות בתוכן זה';
    
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {React.isValidElement(children) ? (
          React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(true);
            },
            disabled: true,
            className: `${(children as any).props?.className || ''} opacity-50 cursor-not-allowed pointer-events-none`.trim()
          })
        ) : (
          <div className="opacity-50 cursor-not-allowed pointer-events-none">
            {children}
          </div>
        )}
        
        {showTooltip && (
          <div 
            ref={tooltipRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 glass-card border border-yellow-400/30 text-white text-sm rounded-xl p-4 shadow-xl z-50 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-400" />
              <div className="flex-1">
                <p className="font-medium mb-3 text-white">{message}</p>
                <Link
                  href="/subscription"
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-500 hover:bg-yellow-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>שדרג לפרימיום</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-[#1e293b] border-r border-b border-yellow-400/30 rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // User is authenticated and meets requirements - allow action
  // Just pass through the children - they handle their own onClick
  if (React.isValidElement(children)) {
    // Merge className if provided
    const childClassName = (children as any).props?.className || '';
    const mergedClassName = className ? `${className} ${childClassName}`.trim() : childClassName;
    
    return React.cloneElement(children as React.ReactElement<any>, {
      className: mergedClassName || undefined
    });
  }

  return <>{children}</>;
}

