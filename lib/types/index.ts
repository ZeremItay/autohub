/**
 * Shared type definitions for the application
 */

// User and Profile types
export interface Role {
  id: string;
  name: 'free' | 'premium' | 'admin';
  display_name: string;
  description?: string;
  price?: number;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  nickname?: string;
  experience_level?: string;
  points?: number;
  rank?: number;
  is_online?: boolean;
  email?: string;
  role_id: string;
  social_links?: SocialLink[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfileWithRole extends Profile {
  role?: Role;
  roles?: Role;
}

export interface User {
  id: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  role?: Role;
  roles?: Role;
  [key: string]: any;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Loading state
export interface LoadingState {
  loading: boolean;
  error: Error | null;
}

// Common entity types
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

