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
  pointsCost?: number; // Cost in points for free users
  onClick?: (e?: React.MouseEvent) => void;
  disabledMessage?: string;
  redirectTo?: string;
  className?: string;
}

export default function ProtectedAction({
  children,
  requireAuth = false,
  requirePremium = false,
  pointsCost,
  onClick,
  disabledMessage,
  redirectTo = '/auth/login',
  className = ''
}: ProtectedActionProps) {
  const router = useRouter();
  const { user, loading, isPremium } = useCurrentUser();
  const [showTooltip, setShowTooltip] = useState(false);
  const userPoints = (user as any)?.points || 0;

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
        
        {/* Invisible bridge to keep tooltip open when moving mouse */}
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 h-3 pointer-events-auto"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
        )}
        
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 mb-3 w-full sm:w-72 sm:max-w-[320px] bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              maxWidth: 'min(320px, 100%)'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1.5 break-words text-xs leading-relaxed">{message}</p>
                <Link
                  href={redirectTo}
                  className="inline-flex items-center gap-1 text-[#F52F8E] hover:underline font-medium text-xs"
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
        
        {/* Invisible bridge to keep tooltip open when moving mouse */}
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 h-3 pointer-events-auto"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
        )}
        
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 mb-3 w-full sm:w-72 sm:max-w-[320px] bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              maxWidth: 'min(320px, 100%)'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1.5 break-words text-xs leading-relaxed">{message}</p>
                <Link
                  href={redirectTo}
                  className="inline-flex items-center gap-1 text-[#F52F8E] hover:underline font-medium text-xs"
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
    const hasEnoughPoints = pointsCost ? (userPoints >= pointsCost) : false;

    // If user has enough points and pointsCost is set, allow the action
    if (pointsCost && hasEnoughPoints) {
      // User can perform action - just pass through (onClick is preserved automatically by cloneElement)
      if (React.isValidElement(children)) {
        const childClassName = (children as any).props?.className || '';
        const mergedClassName = className ? `${className} ${childClassName}`.trim() : childClassName;
        const originalProps = (children as any).props || {};
        
        // Clone element and preserve all original props (including onClick)
        return React.cloneElement(children as React.ReactElement<any>, {
          ...originalProps, // Preserve all original props
          className: mergedClassName || originalProps.className
        });
      }
      return <>{children}</>;
    }
    
    // User doesn't have enough points or no pointsCost - show message
    let defaultMessage: string;
    
    if (pointsCost) {
      // User can pay with points (free or basic users)
      if (hasEnoughPoints) {
        defaultMessage = `פעולה זו עולה ${pointsCost} נקודות. יש לך ${userPoints} נקודות.`;
      } else {
        defaultMessage = `פעולה זו עולה ${pointsCost} נקודות. יש לך ${userPoints} נקודות בלבד. שדרג לפרימיום כדי לבצע פעולה זו ללא נקודות.`;
      }
    } else {
      // No points option - premium required
      defaultMessage = 'צריך לשדרג לפרימיום כדי לצפות בתוכן זה';
    }
    
    const message = disabledMessage || defaultMessage;
    
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
        
        {/* Invisible bridge to keep tooltip open when moving mouse */}
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 h-3 pointer-events-auto"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
        )}
        
        {showTooltip && (
          <div 
            className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-3 w-[calc(100vw-2rem)] sm:w-72 max-w-[320px] bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg z-50 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              maxWidth: 'min(320px, calc(100vw - 2rem))'
            }}
          >
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1.5 break-words text-xs leading-relaxed">{message}</p>
                <div className="flex flex-col gap-1.5">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 text-yellow-400 hover:underline font-medium text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>שדרג לפרימיום</span>
                  </Link>
                  {pointsCost && (
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline font-medium text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{hasEnoughPoints ? 'השתמש בנקודות' : 'הרוויח נקודות'}</span>
                    </Link>
                  )}
                </div>
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
  // Simply return children as-is - no need to clone if we're not modifying anything
  return <>{children}</>;
}

