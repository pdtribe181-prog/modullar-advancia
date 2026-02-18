import type { Response } from 'express';

/**
 * Application error with status code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: Record<string, string[]>): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Extract error message safely from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

/**
 * Extract error status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  if (error && typeof error === 'object') {
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    // Stripe errors
    if ('type' in error && error.type === 'StripeInvalidRequestError') {
      return 400;
    }
    if ('type' in error && error.type === 'StripeAuthenticationError') {
      return 401;
    }
  }
  return 500;
}

/**
 * Check if error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is { message: string; code: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error
  );
}

/**
 * Check if error is a Stripe error
 */
export function isStripeError(error: unknown): error is { type: string; message: string; code?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string' &&
    (error as { type: string }).type.startsWith('Stripe')
  );
}

/**
 * Send error response with consistent format
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  requestId?: string
): Response {
  const message = getErrorMessage(error);
  const statusCode = getErrorStatusCode(error);
  
  const response: {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, string[]>;
    requestId?: string;
  } = {
    success: false,
    error: message,
  };

  if (error instanceof AppError) {
    if (error.code) response.code = error.code;
    if (error.details) response.details = error.details;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Async route handler wrapper that catches errors
 */
export function asyncHandler<T>(
  fn: (req: T, res: Response, ...args: unknown[]) => Promise<void | Response>
) {
  return (req: T, res: Response, ...args: unknown[]) => {
    Promise.resolve(fn(req, res, ...args)).catch((error) => {
      const requestId = (req as { requestId?: string }).requestId;
      sendErrorResponse(res, error, requestId);
    });
  };
}

/**
 * Wrap async function with try-catch and return result or error
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(getErrorMessage(error)) };
  }
}
