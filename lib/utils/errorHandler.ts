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
  // Skip logging if error is empty or null
  if (!error) {
    return;
  }
  
  // Check if it's a "not found" error (safe to ignore)
  if (isNotFoundError(error)) {
    return;
  }
  
  // Skip if error is an empty object
  if (typeof error === 'object' && Object.keys(error).length === 0) {
    return;
  }
  
  // Extract error message
  const errorMessage = error?.message || error?.error?.message || String(error) || '';
  
  // Skip if we don't have a meaningful message
  if (!errorMessage || errorMessage === '{}' || errorMessage === '[object Object]') {
    return;
  }
  
  const errorInfo: ErrorInfo = {
    message: errorMessage,
    code: error?.code || error?.error?.code,
    details: error?.details || error?.error || error,
    timestamp: new Date(),
    context
  };
  
  // Safely log error to avoid circular reference issues
  let safeDetails = '';
  try {
    if (errorInfo.details) {
      if (typeof errorInfo.details === 'string') {
        safeDetails = errorInfo.details;
      } else if (errorInfo.details?.message) {
        safeDetails = errorInfo.details.message;
      } else if (typeof errorInfo.details === 'object') {
        // Try to extract meaningful information from the object
        const keys = Object.keys(errorInfo.details);
        if (keys.length > 0) {
          // Filter out React internal properties and circular references
          const filteredKeys = keys.filter(key => !key.startsWith('_') && !key.startsWith('__'));
          if (filteredKeys.length > 0) {
            safeDetails = JSON.stringify(
              Object.fromEntries(
                filteredKeys.slice(0, 5).map(key => {
                  try {
                    const value = errorInfo.details[key];
                    // Only include primitive values
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                      return [key, value];
                    }
                    return [key, String(value).substring(0, 100)];
                  } catch {
                    return [key, '[Unable to serialize]'];
                  }
                })
              )
            );
          } else {
            safeDetails = '[Empty object]';
          }
        } else {
          safeDetails = '[Empty object]';
        }
      } else {
        safeDetails = String(errorInfo.details);
      }
    }
  } catch {
    safeDetails = '[Circular reference]';
  }
  
  // Only log if we have meaningful information
  const logData: any = {
    message: errorInfo.message,
    timestamp: errorInfo.timestamp.toISOString(),
  };
  
  if (errorInfo.code) {
    logData.code = errorInfo.code;
  }
  
  if (safeDetails && safeDetails !== '[Empty object]' && safeDetails !== '{}') {
    logData.details = safeDetails;
  }
  
  if (errorInfo.context) {
    logData.context = errorInfo.context;
  }
  
  // Only log if we have meaningful content (not empty object)
  const hasContent = (logData.message && logData.message !== '{}' && logData.message !== '[object Object]') || 
                    (logData.code && logData.code !== '{}');
  
  if (hasContent && Object.keys(logData).length > 0) {
    console.error(`[${context || 'Error'}]`, logData);
  }
  
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

