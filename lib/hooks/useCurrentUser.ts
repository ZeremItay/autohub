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
      // Try to load user - simplified logic
      const currentUser = await getCurrentUser();
      
      // If user loading failed, check session as fallback
      if (!currentUser) {
        try {
          const { supabase } = await import('../supabase');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Use minimal user from session
            setUser({
              id: session.user.id,
              user_id: session.user.id,
              display_name: session.user.email?.split('@')[0] || 'משתמש',
              email: session.user.email
            });
            setLoading(false);
            return;
          }
        } catch (sessionError) {
          // Session check failed - user is not logged in
        }
      }
      
      setUser(currentUser);
    } catch (err: any) {
      // If error occurs, try to get user from session as fallback
      try {
        const { supabase } = await import('../supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Use minimal user from session
          setUser({
            id: session.user.id,
            user_id: session.user.id,
            display_name: session.user.email?.split('@')[0] || 'משתמש',
            email: session.user.email
          });
          setError(null);
          setLoading(false);
          return;
        }
      } catch (sessionError) {
        // Session check also failed
      }
      
      // No session - clear user state
      console.error('Error loading current user:', err);
      setError(err);
      setUser(null);
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

