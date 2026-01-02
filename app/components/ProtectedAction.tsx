'use client';

import { useState } from 'react';
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

  // Show loading state
  if (loading) {
    return (
      <div className={`${className} opacity-50 cursor-not-allowed`}>
        {children}
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    const message = disabledMessage || 'עליך להתחבר לאתר כדי לצפות בתוכן';
    
    return (
      <div 
        className="relative inline-block w-full sm:w-auto"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
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
            className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 mb-2 w-full sm:w-64 sm:max-w-[280px] bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(280px, 100%)'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-2 break-words">{message}</p>
                <Link
                  href={redirectTo}
                  className="inline-flex items-center gap-1 text-[#F52F8E] hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LogIn className="w-3 h-3" />
                  <span>התחבר</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full right-4 sm:right-1/2 sm:translate-x-1/2 -mt-1 hidden sm:block">
              <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
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
        className="relative inline-block w-full sm:w-auto"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
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
            className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 mb-2 w-full sm:w-64 sm:max-w-[280px] bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(280px, 100%)'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-2 break-words">{message}</p>
                <Link
                  href={redirectTo}
                  className="inline-flex items-center gap-1 text-[#F52F8E] hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LogIn className="w-3 h-3" />
                  <span>התחבר</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full right-4 sm:right-1/2 sm:translate-x-1/2 -mt-1 hidden sm:block">
              <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
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
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
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
            className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-[calc(100vw-2rem)] sm:w-64 max-w-[280px] bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(280px, calc(100vw - 2rem))'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-2 break-words">{message}</p>
                <Link
                  href="/subscription"
                  className="inline-flex items-center gap-1 text-yellow-400 hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>שדרג לפרימיום</span>
                </Link>
              </div>
            </div>
            <div className="absolute top-full right-4 sm:right-1/2 sm:translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
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

