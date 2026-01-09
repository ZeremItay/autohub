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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load user timeout')), 8000); // 8 seconds timeout
      });

      const currentUser = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ]);
      
      setUser(currentUser);
    } catch (err: any) {
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

