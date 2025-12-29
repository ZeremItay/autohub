/**
 * Centralized error handling utilities
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  context?: string;
}

/**
 * Log error with context
 */
export function logError(error: Error | any, context?: string): void {
  const errorInfo: ErrorInfo = {
    message: error?.message || String(error),
    code: error?.code,
    details: error?.details || error,
    timestamp: new Date(),
    context
  };
  
  console.error(`[${context || 'Error'}]`, errorInfo);
  
  // In production, you might want to send this to an error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Handle error gracefully - log and return user-friendly message
 */
export function handleError(error: Error | any, context?: string): string {
  logError(error, context);
  
  // Return user-friendly error message
  if (error?.message) {
    // Check for common Supabase errors
    if (error.message.includes('PGRST')) {
      return 'שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'בעיית חיבור. אנא בדוק את החיבור לאינטרנט.';
    }
    return error.message;
  }
  
  return 'אירעה שגיאה. אנא נסה שוב.';
}

/**
 * Check if error is a "not found" error (safe to ignore)
 */
export function isNotFoundError(error: any): boolean {
  if (!error) return false;
  
  const code = error.code || error.status || '';
  const message = error.message || '';
  
  return (
    code === 'PGRST116' ||
    code === 404 ||
    message.includes('not found') ||
    message.includes('Could not find')
  );
}

/**
 * Check if error is a duplicate key error (safe to ignore in some cases)
 */
export function isDuplicateError(error: any): boolean {
  if (!error) return false;
  
  const code = error.code || '';
  const message = error.message || '';
  
  return (
    code === '23505' ||
    message.includes('duplicate') ||
    message.includes('unique constraint')
  );
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context || fn.name);
      throw error;
    }
  }) as T;
}

/**
 * Silent error handler - logs but doesn't throw
 */
export async function silentErrorHandler<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Only log if it's not a "not found" error
    if (!isNotFoundError(error)) {
      logError(error, context);
    }
    return defaultValue;
  }
}

