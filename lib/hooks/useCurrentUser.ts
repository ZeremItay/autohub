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
    
    try {
      // Add timeout to prevent hanging - increased to 15 seconds
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Load user timeout')), 15000); // 15 seconds timeout
      });

      const currentUser = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ]);

      if (timeoutId) clearTimeout(timeoutId);
      
      setUser(currentUser);
    } catch (err: any) {
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

