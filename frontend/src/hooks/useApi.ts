import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiOptions {
  /** Skip initial fetch */
  skip?: boolean;
  /** Cache key for deduplication */
  cacheKey?: string;
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Hook for data fetching with loading/error states
 */
export function useApi<T>(
  path: string,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => Promise<void> } {
  const { skip = false, cacheKey, refetchInterval = 0 } = options;
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !skip,
    error: null,
  });
  
  const mountedRef = useRef(true);
  const key = cacheKey || path;

  const fetchData = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState({ data: cached.data as T, loading: false, error: null });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await api.get<T>(path);
      
      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
        
        // Update cache
        if (cacheKey) {
          cache.set(key, { data, timestamp: Date.now() });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: err instanceof ApiError ? err : new ApiError('Unknown error', 0),
        });
      }
    }
  }, [path, key, cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!skip) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [skip, fetchData]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval > 0 && !skip) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, skip, fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE)
 */
export function useMutation<TData, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: ApiError | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await mutationFn(variables);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError('Unknown error', 0);
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Invalidate cache entries matching a prefix
 */
export function invalidateCache(prefix?: string) {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
