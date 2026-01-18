/**
 * Sanitize profile data for API responses
 * Removes sensitive fields and only includes safe, public data
 */

export interface SanitizedProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  social_links: any;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  created_at: string;
  // Excluded: email, phone, address, internal IDs, sensitive personal data
}

/**
 * Sanitize profile for public API responses
 * Removes all sensitive data including email
 */
export function sanitizeProfileForPublic(profile: any): SanitizedProfile | null {
  if (!profile) return null;

  return {
    id: profile.id,
    user_id: profile.user_id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    headline: profile.headline,
    bio: profile.bio,
    social_links: profile.social_links || [],
    first_name: profile.first_name,
    last_name: profile.last_name,
    nickname: profile.nickname,
    created_at: profile.created_at,
  };
}

/**
 * Sanitize profile for admin API responses
 * Includes email but excludes other sensitive internal data
 * NOTE: Only use this in admin-only endpoints with proper authentication
 */
export function sanitizeProfileForAdmin(profile: any): any {
  if (!profile) return null;

  return {
    id: profile.id,
    user_id: profile.user_id,
    display_name: profile.display_name,
    email: profile.email, // Only for admin operations
    avatar_url: profile.avatar_url,
    headline: profile.headline,
    bio: profile.bio,
    social_links: profile.social_links || [],
    first_name: profile.first_name,
    last_name: profile.last_name,
    nickname: profile.nickname,
    points: profile.points,
    level: profile.level,
    role_id: profile.role_id,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    // Excluded: internal IDs, sensitive personal data beyond email
  };
}

/**
 * Sanitize array of profiles for public API responses
 */
export function sanitizeProfilesForPublic(profiles: any[]): SanitizedProfile[] {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(sanitizeProfileForPublic).filter((p): p is SanitizedProfile => p !== null);
}
