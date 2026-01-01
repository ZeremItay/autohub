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
  
  // Skip if error is an empty object (check multiple ways)
  if (typeof error === 'object') {
    try {
      const keys = Object.keys(error);
      // If it's an empty object or only has internal React properties
      if (keys.length === 0 || keys.every(key => key.startsWith('_') || key.startsWith('__'))) {
        return;
      }
      // If all values are null/undefined/empty
      const hasAnyValue = keys.some(key => {
        const value = error[key];
        return value !== null && value !== undefined && value !== '' && 
               (typeof value !== 'object' || Object.keys(value || {}).length > 0);
      });
      if (!hasAnyValue) {
        return;
      }
      
      // Additional check: if error stringifies to '{}', skip it
      try {
        const stringified = JSON.stringify(error);
        if (stringified === '{}' || stringified === 'null') {
          return;
        }
      } catch {
        // If stringification fails, continue with other checks
      }
    } catch {
      // If we can't check keys, skip
      return;
    }
  }
  
  // If error stringifies to '{}', skip it
  try {
    if (String(error) === '{}' || String(error) === '[object Object]') {
      // Check if we have any meaningful properties
      if (typeof error === 'object' && error !== null) {
        const hasMeaningfulProps = Object.keys(error).some(key => {
          const value = error[key];
          return value !== null && value !== undefined && value !== '' && 
                 (typeof value !== 'object' || (value && Object.keys(value).length > 0));
        });
        if (!hasMeaningfulProps) {
          return;
        }
      } else {
        return;
      }
    }
  } catch {
    // Continue if string conversion fails
  }
  
  // Extract error message
  const errorMessage = error?.message || error?.error?.message || String(error) || '';
  
  // Check if we have meaningful properties
  const hasCode = error?.code && error.code !== '{}' && error.code !== '' && String(error.code).trim() !== '';
  const hasDetails = error?.details && (
    (typeof error.details === 'string' && error.details.trim() !== '') ||
    (typeof error.details === 'object' && error.details !== null && Object.keys(error.details).length > 0)
  );
  const hasHint = error?.hint && error.hint !== '{}' && error.hint !== '' && String(error.hint).trim() !== '';
  
  // Skip if we don't have a meaningful message AND no other meaningful info
  if ((!errorMessage || errorMessage === '{}' || errorMessage === '[object Object]' || errorMessage.trim() === '') &&
      !hasCode && !hasDetails && !hasHint) {
    // No meaningful information to log
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
  const hasLogMessage = logData.message && 
                        logData.message !== '{}' && 
                        logData.message !== '[object Object]' && 
                        logData.message.trim() !== '';
  const hasLogCode = logData.code && logData.code !== '{}' && logData.code !== '';
  const hasLogDetails = logData.details && 
                        logData.details !== '{}' && 
                        logData.details !== '[Empty object]' &&
                        logData.details.trim() !== '';
  
  const hasContent = hasLogMessage || hasLogCode || hasLogDetails;
  
  // Only log if we have meaningful content and at least one non-empty field
  const meaningfulFields = Object.keys(logData).filter(key => {
    const value = logData[key];
    if (value === undefined || value === null || value === '') return false;
    if (value === '{}' || value === '[Empty object]') return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  });
  
  // Final check: ensure logData doesn't stringify to '{}'
  let shouldLog = false;
  try {
    const stringified = JSON.stringify(logData);
    if (stringified !== '{}' && stringified !== '{"timestamp":"..."}' && stringified !== '{"context":"..."}') {
      // Need at least message/code/details (not just timestamp and/or context)
      if (meaningfulFields.length > 2 || (meaningfulFields.length === 2 && (hasLogMessage || hasLogCode || hasLogDetails))) {
        shouldLog = true;
      }
    }
  } catch {
    // If stringification fails, use the meaningful fields check
    if (meaningfulFields.length > 2 || (meaningfulFields.length === 2 && (hasLogMessage || hasLogCode || hasLogDetails))) {
      shouldLog = true;
    }
  }
  
  if (shouldLog) {
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

