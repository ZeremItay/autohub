'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDataLoaderOptions {
  lazy?: boolean;
  cache?: boolean;
  cacheKey?: string;
  delay?: number;
  onError?: (error: Error) => void;
}

interface UseDataLoaderReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for loading data with caching and lazy loading support
 */
export function useDataLoader<T>(
  loader: () => Promise<T>,
  options: UseDataLoaderOptions = {}
): UseDataLoaderReturn<T> {
  const {
    lazy = false,
    cache = false,
    cacheKey,
    delay = 0,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const loadData = useCallback(async () => {
    // Check cache if enabled
    if (cache && cacheKey) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loader();
      setData(result);
      
      // Store in cache if enabled
      if (cache && cacheKey) {
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [loader, cache, cacheKey, onError]);

  useEffect(() => {
    if (lazy) {
      // Lazy load with delay
      const timeoutId = setTimeout(() => {
        loadData();
      }, delay);
      
      return () => clearTimeout(timeoutId);
    } else {
      loadData();
    }
  }, [lazy, delay, loadData]);

  return {
    data,
    loading,
    error,
    refetch: loadData
  };
}

