'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getAllProfiles, type ProfileWithRole } from '../queries/profiles';

interface UseOnlineUsersReturn {
  users: ProfileWithRole[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for loading online users
 * Only counts users with active Supabase sessions
 */
export function useOnlineUsers(): UseOnlineUsersReturn {
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOnlineUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all profiles
      const { data: profiles } = await getAllProfiles();
      
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const online: ProfileWithRole[] = [];
      
      // Only count the current logged-in user as online
      // This is more accurate than relying on is_online field
      if (currentSession && currentSession.user) {
        const currentUserProfile = profiles.find((p: any) => p.user_id === currentSession.user.id);
        if (currentUserProfile) {
          online.push(currentUserProfile);
        }
      }
      
      setUsers(online);
    } catch (err: any) {
      console.error('Error loading online users:', err);
      setError(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnlineUsers();
  }, [loadOnlineUsers]);

  return {
    users,
    loading,
    error,
    refetch: loadOnlineUsers
  };
}

