import { captureError } from '../lib/sentry';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const hasExplicitApiBase = Boolean(import.meta.env.VITE_API_URL);

/**
 * Custom API error with typed details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidationError() {
    return this.status === 400;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get isServerError() {
    return this.status >= 500;
  }

  /** Check if this error type should be retried */
  get isRetryable() {
    return this.isNetworkError || this.isServerError || this.isRateLimited;
  }
}

interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Add random jitter to delay (default: true) */
  jitter?: boolean;
  /** HTTP status codes that should trigger retry (default: 429, 500-599) */
  retryOn?: number[];
  /** Methods that can be retried (default: GET, HEAD, OPTIONS) */
  retryMethods?: string[];
  /** Called before each retry attempt */
  onRetry?: (error: ApiError, attempt: number, delay: number) => void;
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retry?: RetryConfig | false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: boolean
): number {
  // Exponential backoff: 2^attempt * baseDelay
  let delay = Math.min(Math.pow(2, attempt) * baseDelay, maxDelay);

  // Add jitter (±25%) to prevent thundering herd
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
    delay = Math.round(delay * jitterFactor);
  }

  return delay;
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiService {
  private token: string | null = null;
  private defaultTimeout = 30000; // 30 seconds

  // Default retry config (only for safe methods)
  private defaultRetryConfig: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    retryOn: [429, 500, 502, 503, 504],
    retryMethods: ['GET', 'HEAD', 'OPTIONS'],
    onRetry: () => {},
  };

  constructor() {
    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }

    if (!hasExplicitApiBase && typeof window !== 'undefined') {
      // Helps catch misconfigured builds where VITE_API_URL is missing.
      console.warn('[API] VITE_API_URL not set; defaulting to /api/v1');
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Check if a request should be retried
   */
  private shouldRetry(
    method: string,
    status: number,
    attempt: number,
    config: Required<RetryConfig>
  ): boolean {
    if (attempt >= config.maxRetries) return false;
    if (!config.retryMethods.includes(method.toUpperCase())) return false;
    if (!config.retryOn.includes(status) && status !== 0) return false;
    return true;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { timeout = this.defaultTimeout, retry = {}, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();

    // Merge retry config
    const retryConfig: Required<RetryConfig> | null =
      retry === false ? null : { ...this.defaultRetryConfig, ...retry };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${API_BASE}${path}`, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting with retry-after
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

          if (retryConfig && this.shouldRetry(method, 429, attempt, retryConfig)) {
            retryConfig.onRetry(
              new ApiError('Rate limited', 429, 'RATE_LIMITED'),
              attempt,
              waitTime
            );
            await sleep(waitTime);
            attempt++;
            continue;
          }

          throw new ApiError(
            `Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
            429,
            'RATE_LIMITED',
            { retryAfter: waitTime }
          );
        }

        let data: unknown;
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const errorData = typeof data === 'object' && data !== null ? data : { message: data };
          const body = errorData as { message?: string; code?: string };
          const error = new ApiError(
            body.message ?? `HTTP error! status: ${response.status}`,
            response.status,
            body.code,
            errorData
          );

          // Dispatch auth:unauthorized event so AuthProvider can clear session
          if (response.status === 401) {
            window.dispatchEvent(new Event('auth:unauthorized'));
          }

          // Capture the error in Sentry
          captureError(error, {
            extra: {
              path,
              status: response.status,
              responseBody: errorData,
            },
          });

          // Retry logic
          if (retryConfig && this.shouldRetry(method, response.status, attempt, retryConfig)) {
            const delay = calculateRetryDelay(
              attempt,
              retryConfig.baseDelay,
              retryConfig.maxDelay,
              retryConfig.jitter
            );
            retryConfig.onRetry(error, attempt, delay);
            await sleep(delay);
            attempt++;
            continue;
          }

          throw error;
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout
        if (error instanceof DOMException && error.name === 'AbortError') {
          const timeoutError = new ApiError('Request timed out', 0, 'TIMEOUT');

          // Retry on timeout
          if (retryConfig && this.shouldRetry(method, 0, attempt, retryConfig)) {
            const delay = calculateRetryDelay(
              attempt,
              retryConfig.baseDelay,
              retryConfig.maxDelay,
              retryConfig.jitter
            );
            retryConfig.onRetry(timeoutError, attempt, delay);
            await sleep(delay);
            attempt++;
            continue;
          }

          throw timeoutError;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const networkError = new ApiError(
            'Network error or server is unreachable.',
            0, // Use 0 for network errors
            'NETWORK_ERROR',
            { originalError: error }
          );

          // Capture network errors in Sentry
          captureError(networkError, {
            extra: {
              path,
              originalError: error,
            },
          });

          // Retry logic for network errors
          if (retryConfig && this.shouldRetry(method, 0, attempt, retryConfig)) {
            const delay = Math.min(
              calculateRetryDelay(
                attempt,
                retryConfig.baseDelay,
                retryConfig.maxDelay,
                retryConfig.jitter
              ),
              retryConfig.maxDelay
            );
            retryConfig.onRetry(networkError, attempt, delay);
            await sleep(delay);
            attempt++;
            continue;
          }

          throw networkError;
        }

        // Re-throw ApiError as-is
        if (error instanceof ApiError) {
          throw error;
        }

        // Wrap unknown errors
        throw new ApiError(
          error instanceof Error ? error.message : 'An unknown error occurred',
          0,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request(path, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
