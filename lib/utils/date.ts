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

/**
 * Format time string to HH:MM format
 */
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '';
  // Time format is usually HH:MM:SS or HH:MM
  return timeString.substring(0, 5);
}

/**
 * Format full date and time with day of week: "יום שלישי, 30 בדצמבר 2025 • 11:00"
 */
export function formatFullDateTime(dateString: string | Date | null | undefined, timeString: string | null | undefined): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const dayName = days[date.getDay()];
  const formattedDate = formatDate(dateString);
  const formattedTime = formatTime(timeString);
  
  return `יום ${dayName}, ${formattedDate} • ${formattedTime}`;
}

/**
 * Format time from date string: extracts HH:MM from a date string
 */
export function formatTimeFromDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

/**
 * Format current date to DD.MM.YYYY
 */
export function formatCurrentDate(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format date to object with day, month, monthShort, year (for calendar display)
 */
export function formatDateObject(dateString: string | Date | null | undefined): {
  day: number;
  month: string;
  monthShort: string;
  year: number;
} | null {
  if (!dateString) return null;
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return null;
  
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const monthShort = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
  
  return {
    day: date.getDate(),
    month: monthNames[date.getMonth()],
    monthShort: monthShort[date.getMonth()],
    year: date.getFullYear()
  };
}

