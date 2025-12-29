/**
 * Format date to Hebrew format: "יום חודש שנה"
 */
export function formatDate(dateString: string | Date | null | undefined, options?: {
  includeTime?: boolean;
  short?: boolean;
}): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  
  if (options?.short) {
    // Short format: "יום.חודש.שנה"
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
  
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  if (options?.includeTime) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  }
  
  return `${day} ${month} ${year}`;
}

/**
 * Format date and time to Hebrew format
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, { includeTime: true });
}

/**
 * Format time ago: "לפני X זמן"
 */
export function formatTimeAgo(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'לפני רגע';
  } else if (diffMinutes < 60) {
    return `לפני ${diffMinutes} דקות`;
  } else if (diffHours < 24) {
    return `לפני ${diffHours} שעות`;
  } else if (diffDays < 7) {
    return `לפני ${diffDays} ימים`;
  } else if (diffWeeks < 4) {
    return `לפני ${diffWeeks} שבועות`;
  } else if (diffMonths < 12) {
    return `לפני ${diffMonths} חודשים`;
  } else {
    return `לפני ${diffYears} שנים`;
  }
}

/**
 * Check if date is recent (within specified days, default 30)
 */
export function isRecent(dateString: string | Date | null | undefined, days: number = 30): boolean {
  if (!dateString) return false;
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return false;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays <= days;
}

