/**
 * Global application state using Zustand
 * Centralized state management for user, notifications, and UI state
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserWithRole } from '@/lib/utils/user';

interface AppState {
  // User state
  currentUser: UserWithRole | null;
  setCurrentUser: (user: UserWithRole | null) => void;
  
  // Notifications
  notifications: any[];
  unreadCount: number;
  setNotifications: (notifications: any[]) => void;
  setUnreadCount: (count: number) => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Online users
  onlineUsers: any[];
  setOnlineUsers: (users: any[]) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // User state
        currentUser: null,
        setCurrentUser: (user) => set({ currentUser: user }),
        
        // Notifications
        notifications: [],
        unreadCount: 0,
        setNotifications: (notifications) => set({ notifications }),
        setUnreadCount: (count) => set({ unreadCount: count }),
        
        // UI state
        sidebarOpen: true,
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        // Online users
        onlineUsers: [],
        setOnlineUsers: (users) => set({ onlineUsers: users }),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          // Don't persist user, notifications, etc. - they should be fetched fresh
        }),
      }
    ),
    { name: 'AppStore' }
  )
);




