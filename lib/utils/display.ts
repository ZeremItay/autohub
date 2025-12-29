/**
 * Get display name from profile with fallback chain
 * Priority: display_name > first_name > nickname > 'משתמש'
 */
export function getDisplayName(profile: {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  [key: string]: any;
} | null | undefined): string {
  if (!profile) return 'משתמש';
  
  if (profile.display_name) return profile.display_name;
  if (profile.first_name) {
    if (profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name;
  }
  if (profile.nickname) return profile.nickname;
  
  return 'משתמש';
}

/**
 * Get initials from name
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'מ';
  
  // Remove extra spaces and split
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Single word - take first character
    return parts[0].charAt(0).toUpperCase();
  } else {
    // Multiple words - take first character of first and last word
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string | null | undefined, length: number): string {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return text.substring(0, length) + '...';
}

/**
 * Truncate text by words (for Hebrew text)
 */
export function truncateTextByWords(text: string | null | undefined, wordCount: number): string {
  if (!text) return '';
  
  const words = text.split(/\s+/);
  if (words.length <= wordCount) return text;
  
  return words.slice(0, wordCount).join(' ') + '...';
}

