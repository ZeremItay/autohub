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
 * @param profiles - Optional profiles array to avoid duplicate fetch
 */
export function useOnlineUsers(profiles?: ProfileWithRole[]): UseOnlineUsersReturn {
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(!profiles); // If profiles provided, start as not loading
  const [error, setError] = useState<Error | null>(null);

  const loadOnlineUsers = useCallback(async (providedProfiles?: ProfileWithRole[]) => {
    setLoading(true);
    setError(null);
    
    try {
      let profilesToUse = providedProfiles;
      
      // Only fetch if profiles not provided
      if (!profilesToUse) {
        const { data: profilesData } = await getAllProfiles();
        profilesToUse = profilesData as any[];
      }
      
      if (!profilesToUse || profilesToUse.length === 0) {
        setUsers([]);
        return;
      }

      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const online: ProfileWithRole[] = [];
      
      // Only count the current logged-in user as online
      // This is more accurate than relying on is_online field
      if (currentSession && currentSession.user) {
        const currentUserProfile = profilesToUse.find((p: any) => p.user_id === currentSession.user.id);
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
    if (profiles) {
      // If profiles provided, use them immediately
      loadOnlineUsers(profiles);
    } else {
      // Otherwise fetch them
      loadOnlineUsers();
    }
  }, [profiles, loadOnlineUsers]);

  return {
    users,
    loading,
    error,
    refetch: () => loadOnlineUsers(profiles)
  };
}

