'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, isPremiumUser as checkPremium, isAdmin as checkAdmin, type UserWithRole } from '../utils/user';

interface UseCurrentUserReturn {
  user: UserWithRole | null;
  loading: boolean;
  error: Error | null;
  isPremium: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for loading current user with caching
 * Returns user, loading state, error, and role checks
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout to prevent hanging - increased to 15 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Load user timeout')), 15000); // 15 seconds timeout
      });

      let currentUser;
      try {
        currentUser = await Promise.race([
          getCurrentUser(),
          timeoutPromise
        ]);
      } catch (raceError: any) {
        // Suppress Chrome extension errors
        if (raceError?.message?.includes('message channel') || 
            raceError?.message?.includes('asynchronous response')) {
          console.warn('Chrome extension error suppressed, retrying user load...');
          // Retry without race to avoid extension interference
          currentUser = await getCurrentUser();
        } else {
          throw raceError;
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
      
      setUser(currentUser);
    } catch (err: any) {
      // Suppress Chrome extension errors - they don't affect functionality
      if (err?.message?.includes('message channel') || 
          err?.message?.includes('asynchronous response')) {
        console.warn('Chrome extension error suppressed in useCurrentUser');
        // Try to load user without race to avoid extension interference
        try {
          const user = await getCurrentUser();
          if (user) {
            setUser(user);
            setError(null);
          } else {
            setUser(null);
          }
        } catch (retryError) {
          // If retry also fails, check session
          try {
            const { supabase } = await import('../supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Keep previous user state if exists, or set minimal user
              if (!user) {
                setUser({
                  id: session.user.id,
                  user_id: session.user.id,
                  display_name: session.user.email?.split('@')[0] || 'משתמש',
                  email: session.user.email
                });
              }
            } else {
              setUser(null);
            }
          } catch (sessionError) {
            // Keep previous user state to avoid false disconnection
            console.warn('Session check failed, keeping previous user state');
          }
        }
        return;
      }
      
      // If timeout occurs, check if there's an active session before clearing user
      // This prevents disconnecting users who are actually logged in
      try {
        const { supabase } = await import('../supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User has active session but loading timed out - don't clear user state
          // Try to load user again in background (non-blocking)
          console.warn('User loading timed out but session exists, retrying...');
          getCurrentUser()
            .then(user => {
              if (user) {
                setUser(user);
                setError(null);
              }
            })
            .catch(() => {
              // Silently fail retry
            });
          
          // Don't clear user or set error - keep previous state if exists
          // This prevents disconnecting users during slow network
          return;
        } else {
          // No session - user is actually not logged in
          console.error('Error loading current user:', err);
          setError(err);
          setUser(null);
        }
      } catch (sessionCheckError) {
        // If session check also fails, don't clear user to be safe
        console.error('Error checking session after timeout:', sessionCheckError);
        // Keep previous user state to avoid false disconnection
      }
    } finally {
      // Ensure timeout is always cleared
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const isPremium = checkPremium(user);
  const isAdmin = checkAdmin(user);

  return {
    user,
    loading,
    error,
    isPremium,
    isAdmin,
    refetch: loadUser
  };
}

