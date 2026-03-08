import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Must use vi.hoisted so the variable exists when vi.mock factory runs (hoisted)
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('../services/api', () => ({
  api: { get: mockGet },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

import { ApiError } from '../services/api';

// Import after mocking
import { useApi, useMutation, invalidateCache } from './useApi';

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache(); // clear any cached data
  });

  it('fetches data on mount', async () => {
    mockGet.mockResolvedValue({ items: [1, 2] });

    const { result } = renderHook(() => useApi('/items'));

    // Starts loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1, 2] });
    expect(result.current.error).toBeNull();
  });

  it('handles API error', async () => {
    mockGet.mockRejectedValue(new ApiError('Server error', 500));

    const { result } = renderHook(() => useApi('/fail'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Server error');
  });

  it('skips fetch when skip=true', () => {
    const { result } = renderHook(() => useApi('/items', { skip: true }));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('refetch re-fetches data', async () => {
    mockGet.mockResolvedValue({ v: 1 });

    const { result } = renderHook(() => useApi('/items'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ v: 1 });

    mockGet.mockResolvedValue({ v: 2 });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toEqual({ v: 2 });
  });
});

describe('useMutation', () => {
  it('starts idle', () => {
    const mutationFn = vi.fn();
    const { result } = renderHook(() => useMutation(mutationFn));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets loading during mutation', async () => {
    let resolvePromise: (v: unknown) => void;
    const mutationFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );
    const { result } = renderHook(() => useMutation(mutationFn));

    const mutatePromise = act(async () => {
      const p = result.current.mutate({ name: 'test' });
      resolvePromise!({ id: 1 });
      return p;
    });

    await mutatePromise;
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.loading).toBe(false);
  });

  it('handles mutation error', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new ApiError('Bad request', 400));
    const { result } = renderHook(() => useMutation(mutationFn));

    await act(async () => {
      try {
        await result.current.mutate({});
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('reset clears state', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useMutation(mutationFn));

    await act(async () => {
      await result.current.mutate({});
    });
    expect(result.current.data).toEqual({ id: 1 });

    act(() => result.current.reset());
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('invalidateCache', () => {
  it('clears all cache when no prefix', () => {
    // Just verify it doesn't throw
    invalidateCache();
  });

  it('clears cache by prefix', () => {
    invalidateCache('/items');
  });
});
