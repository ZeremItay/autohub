/**
 * Utility functions for lazy loading data with delays
 */

/**
 * Lazy load a function with a delay
 * Returns a promise that resolves after the delay
 */
export function lazyLoad<T>(
  loader: () => Promise<T>,
  delay: number = 100
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await loader();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

/**
 * Lazy load multiple functions in parallel with a delay
 */
export function lazyLoadBatch<T>(
  loaders: Array<() => Promise<T>>,
  delay: number = 100
): Promise<T[]> {
  return lazyLoad(async () => {
    const results = await Promise.all(loaders.map(loader => loader()));
    return results;
  }, delay);
}

/**
 * Lazy load with retry logic
 */
export async function lazyLoadWithRetry<T>(
  loader: () => Promise<T>,
  options: {
    delay?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { delay = 100, maxRetries = 3, retryDelay = 1000 } = options;
  
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await loader();
          resolve(result);
          return;
        } catch (error: any) {
          lastError = error;
          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      reject(lastError || new Error('Failed to load after retries'));
    }, delay);
  });
}

/**
 * Create a debounced loader function
 */
export function createDebouncedLoader<T>(
  loader: () => Promise<T>,
  delay: number = 300
): () => Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<T> | null = null;
  
  return (): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (pendingPromise) {
        // If there's a pending promise, wait for it
        pendingPromise.then(resolve).catch(reject);
        return;
      }
      
      timeoutId = setTimeout(async () => {
        try {
          pendingPromise = loader();
          const result = await pendingPromise;
          pendingPromise = null;
          resolve(result);
        } catch (error) {
          pendingPromise = null;
          reject(error);
        }
      }, delay);
    });
  };
}

