import { Theme } from '@/lib/contexts/ThemeContext';

/**
 * Utility functions for theme-based styling
 * Reduces code duplication and improves maintainability
 */

// Card Styles
export function getCardStyles(theme: Theme, variant: 'default' | 'glass' = 'default'): string {
  if (theme === 'light') {
    return 'bg-white border border-gray-300 shadow-sm';
  }
  return variant === 'glass' ? 'glass-card' : 'bg-dark-bg';
}

export function getCardRoundedStyles(theme: Theme, rounded: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' = 'xl'): string {
  const roundedClass = `rounded-${rounded}`;
  return `${roundedClass} ${getCardStyles(theme)}`;
}

// Button Styles
export function getButtonStyles(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary'
): string {
  if (theme === 'light') {
    switch (variant) {
      case 'primary':
        return 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]';
      case 'secondary':
        return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
      case 'outline':
        return 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50';
      case 'ghost':
        return 'text-gray-600 hover:bg-gray-50';
      default:
        return 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]';
    }
  }
  // Neon theme
  switch (variant) {
    case 'primary':
      return 'btn-primary';
    case 'secondary':
      return 'btn-secondary';
    case 'outline':
      return 'border-2 border-hot-pink text-hot-pink hover:bg-hot-pink/10';
    case 'ghost':
      return 'text-foreground-light hover:bg-white/5';
    default:
      return 'btn-primary';
  }
}

export function getButtonRoundedStyles(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary',
  rounded: 'sm' | 'md' | 'lg' | 'xl' = 'lg'
): string {
  return `${getButtonStyles(theme, variant)} rounded-${rounded}`;
}

// Text Styles
export function getTextStyles(
  theme: Theme,
  variant: 'default' | 'heading' | 'subheading' | 'muted' | 'accent' = 'default'
): string {
  if (theme === 'light') {
    switch (variant) {
      case 'heading':
        return 'text-gray-900';
      case 'subheading':
        return 'text-gray-800';
      case 'muted':
        return 'text-gray-600';
      case 'accent':
        return 'text-[#F52F8E]';
      default:
        return 'text-gray-800';
    }
  }
  // Neon theme
  switch (variant) {
    case 'heading':
      return 'text-white';
    case 'subheading':
      return 'text-foreground-light';
    case 'muted':
      return 'text-foreground-muted';
    case 'accent':
      return 'text-hot-pink';
    default:
      return 'text-white';
  }
}

export function getTextColorOnColoredBg(theme: Theme): string {
  return 'text-white';
}

// Input Styles
export function getInputStyles(theme: Theme, hasError: boolean = false): string {
  const baseStyles = 'w-full pr-4 pl-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent';
  
  if (theme === 'light') {
    const errorStyles = hasError ? 'border-red-500' : 'border-gray-300';
    return `${baseStyles} ${errorStyles} bg-white text-gray-800 placeholder-gray-500`;
  }
  // Neon theme
  const errorStyles = hasError ? 'border-red-500' : 'border-white/20';
  return `${baseStyles} ${errorStyles} bg-white/5 text-white placeholder-gray-400`;
}

// Badge Styles
export function getBadgeStyles(
  theme: Theme,
  variant: 'default' | 'admin' | 'reports' | 'featured' | 'new' = 'default'
): string {
  if (theme === 'light') {
    switch (variant) {
      case 'admin':
        return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30';
      case 'reports':
        return 'bg-red-600 text-white';
      case 'featured':
        return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white';
      case 'new':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  }
  // Neon theme
  switch (variant) {
    case 'admin':
      return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
    case 'reports':
      return 'bg-red-600 text-white';
    case 'featured':
      return 'bg-gradient-to-r from-hot-pink to-rose-500 text-white';
    case 'new':
      return 'bg-neon-cyan text-dark-bg';
    default:
      return 'bg-white/10 text-white';
  }
}

// Border Styles
export function getBorderStyles(theme: Theme, variant: 'default' | 'light' | 'accent' = 'default'): string {
  if (theme === 'light') {
    switch (variant) {
      case 'light':
        return 'border-gray-200';
      case 'accent':
        return 'border-[#F52F8E]';
      default:
        return 'border-gray-300';
    }
  }
  // Neon theme
  switch (variant) {
    case 'light':
      return 'border-white/10';
    case 'accent':
      return 'border-hot-pink';
    default:
      return 'border-white/20';
  }
}

// Background Styles
export function getBackgroundStyles(theme: Theme, variant: 'default' | 'card' | 'hover' = 'default'): string {
  if (theme === 'light') {
    switch (variant) {
      case 'card':
        return 'bg-white';
      case 'hover':
        return 'hover:bg-gray-50';
      default:
        return 'bg-transparent';
    }
  }
  // Neon theme
  switch (variant) {
    case 'card':
      return 'bg-dark-bg-light';
    case 'hover':
      return 'hover:bg-white/5';
    default:
      return 'bg-transparent';
  }
}

// Sidebar Styles
export function getSidebarStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-white border-l border-gray-300';
  }
  return 'glass border-l border-white/20';
}

export function getSidebarLinkStyles(theme: Theme, isActive: boolean = false): string {
  const baseStyles = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all';
  
  if (theme === 'light') {
    if (isActive) {
      return `${baseStyles} bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105`;
    }
    return `${baseStyles} text-gray-700 hover:bg-gray-50`;
  }
  // Neon theme
  if (isActive) {
    return `${baseStyles} bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105`;
  }
  return `${baseStyles} text-foreground-light hover:bg-white/5`;
}

// Header Styles
export function getHeaderStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-white border-b border-gray-300';
  }
  return 'glass border-b shadow-lg backdrop-blur-xl border-white/20';
}

// Avatar Styles
export function getAvatarStyles(theme: Theme, variant: 'default' | 'gradient' = 'default'): string {
  if (theme === 'light') {
    if (variant === 'gradient') {
      return 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300';
    }
    return 'bg-blue-500';
  }
  // Neon theme
  if (variant === 'gradient') {
    return 'bg-gradient-to-br from-hot-pink to-neon-cyan';
  }
  return 'bg-gradient-to-br from-blue-500 to-purple-500';
}

// Notification Styles
export function getNotificationStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-white border border-gray-300 shadow-xl';
  }
  return 'glass-card shadow-2xl border border-hot-pink/30';
}

// Modal Styles
export function getModalStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-white border border-gray-200 shadow-xl';
  }
  return 'glass-card shadow-2xl border border-hot-pink/30';
}

// Search Input Styles
export function getSearchInputStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:border-transparent';
  }
  return 'border-white/20 bg-white/5 text-white placeholder-gray-400 focus:border-transparent';
}

// Empty State Styles
export function getEmptyStateStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-[#F3F4F6] border-pink-200 text-gray-600';
  }
  return 'bg-white/5 border-white/10 text-foreground-muted';
}

// Category Tag Styles
export function getCategoryTagStyles(theme: Theme, isActive: boolean = false): string {
  if (theme === 'light') {
    if (isActive) {
      return 'bg-[#F52F8E] text-white';
    }
    return 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50';
  }
  // Neon theme
  if (isActive) {
    return 'bg-hot-pink text-white';
  }
  return 'bg-white/10 text-white hover:bg-white/20';
}

// Forum Card Header Styles (unified color palette)
export function getForumHeaderStyles(
  theme: Theme,
  forumType: 'airtable' | 'make' | 'default' = 'default'
): string {
  if (theme === 'light') {
    // Unified color palette: pink gradient for all forums
    return 'bg-gradient-to-r from-[#F52F8E] to-[#EC4899] text-white';
  }
  return 'bg-transparent text-white';
}

// Professional Content Section Styles
export function getProfessionalContentStyles(theme: Theme): string {
  if (theme === 'light') {
    return 'bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-300';
  }
  return 'glass-card';
}

// Combine multiple style functions
export function combineStyles(...styles: (string | undefined | null | false)[]): string {
  return styles.filter(Boolean).join(' ');
}

// Helper to conditionally apply styles
export function conditionalStyle(condition: boolean, trueStyle: string, falseStyle: string = ''): string {
  return condition ? trueStyle : falseStyle;
}

