/**
 * Shared constants for the application
 */

// User roles
export const ROLES = {
  FREE: 'free',
  PREMIUM: 'premium',
  ADMIN: 'admin'
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// Project statuses
export const PROJECT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed'
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  COMMENT: 'comment',
  REPLY: 'reply',
  MENTION: 'mention',
  LIKE: 'like',
  FOLLOW: 'follow',
  PROJECT_OFFER: 'project_offer',
  FORUM_REPLY: 'forum_reply',
  FORUM_MENTION: 'forum_mention',
  POINTS: 'points'
} as const;

// Cache keys
export const CACHE_KEYS = {
  PROFILES_ALL: 'profiles:all',
  PROJECTS_ALL: 'projects:all',
  FORUMS_ALL: 'forums:all',
  RECORDINGS_ALL: 'recordings:all',
  POSTS_ALL: 'posts:all',
  EVENTS_UPCOMING: 'events:upcoming'
} as const;

// Default values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_RECENT_ITEMS: 5,
  RECENT_DAYS: 30,
  CACHE_TTL_SHORT: 60000,      // 1 minute
  CACHE_TTL_MEDIUM: 300000,     // 5 minutes
  CACHE_TTL_LONG: 600000,       // 10 minutes
  LAZY_LOAD_DELAY: 100,
  DEBOUNCE_DELAY: 300
} as const;

// UI constants
export const UI = {
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_TITLE_LENGTH: 100,
  TRUNCATE_WORDS: 25,
  AVATAR_SIZE: {
    SMALL: 32,
    MEDIUM: 48,
    LARGE: 80
  }
} as const;

// Date formats
export const DATE_FORMATS = {
  FULL: 'DD MMMM YYYY',
  SHORT: 'DD/MM/YYYY',
  TIME: 'HH:mm',
  DATETIME: 'DD/MM/YYYY HH:mm'
} as const;

