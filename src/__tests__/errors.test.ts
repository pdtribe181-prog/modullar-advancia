import {
  AppError,
  getErrorMessage,
  getErrorStatusCode,
  isSupabaseError,
  isStripeError,
  tryCatch,
  sendErrorResponse,
} from '../utils/errors.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('creates an error with default status code', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('creates an error with custom status code', () => {
      const error = new AppError('Custom error', 404);
      expect(error.statusCode).toBe(404);
    });

    it('creates an error with code and details', () => {
      const details = { field: ['Error 1', 'Error 2'] };
      const error = new AppError('Validation error', 400, 'VALIDATION', details);
      expect(error.code).toBe('VALIDATION');
      expect(error.details).toEqual(details);
    });
  });

  describe('static factory methods', () => {
    it('creates bad request error', () => {
      const error = AppError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });

    it('creates bad request error with details', () => {
      const details = { email: ['Invalid format'] };
      const error = AppError.badRequest('Validation failed', details);
      expect(error.details).toEqual(details);
    });

    it('creates unauthorized error with default message', () => {
      const error = AppError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
    });

    it('creates unauthorized error with custom message', () => {
      const error = AppError.unauthorized('Token expired');
      expect(error.message).toBe('Token expired');
    });

    it('creates forbidden error', () => {
      const error = AppError.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('creates not found error with resource name', () => {
      const error = AppError.notFound('User');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('creates not found error with default message', () => {
      const error = AppError.notFound();
      expect(error.message).toBe('Resource not found');
    });

    it('creates conflict error', () => {
      const error = AppError.conflict('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('creates internal error with default message', () => {
      const error = AppError.internal();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
    });
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    const error = new Error('Test message');
    expect(getErrorMessage(error)).toBe('Test message');
  });

  it('returns string as-is', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('extracts message from object with message property', () => {
    const error = { message: 'Object message' };
    expect(getErrorMessage(error)).toBe('Object message');
  });

  it('returns default message for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
  });

  it('returns default message for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
  });

  it('returns default message for number', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });

  it('handles AppError', () => {
    const error = AppError.badRequest('Bad data');
    expect(getErrorMessage(error)).toBe('Bad data');
  });
});

describe('getErrorStatusCode', () => {
  it('returns status code from AppError', () => {
    const error = AppError.notFound('User');
    expect(getErrorStatusCode(error)).toBe(404);
  });

  it('returns statusCode from object', () => {
    const error = { statusCode: 422, message: 'Error' };
    expect(getErrorStatusCode(error)).toBe(422);
  });

  it('returns status from object', () => {
    const error = { status: 429, message: 'Rate limited' };
    expect(getErrorStatusCode(error)).toBe(429);
  });

  it('returns 400 for StripeInvalidRequestError', () => {
    const error = { type: 'StripeInvalidRequestError', message: 'Invalid card' };
    expect(getErrorStatusCode(error)).toBe(400);
  });

  it('returns 401 for StripeAuthenticationError', () => {
    const error = { type: 'StripeAuthenticationError', message: 'Invalid key' };
    expect(getErrorStatusCode(error)).toBe(401);
  });

  it('returns 500 for unknown errors', () => {
    expect(getErrorStatusCode('string error')).toBe(500);
    expect(getErrorStatusCode(null)).toBe(500);
    expect(getErrorStatusCode(undefined)).toBe(500);
  });
});

describe('isSupabaseError', () => {
  it('returns true for Supabase-like errors', () => {
    const error = { message: 'RLS error', code: 'PGRST301' };
    expect(isSupabaseError(error)).toBe(true);
  });

  it('returns false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isSupabaseError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isSupabaseError(null)).toBe(false);
  });

  it('returns false for object without code', () => {
    const error = { message: 'Error' };
    expect(isSupabaseError(error)).toBe(false);
  });
});

describe('isStripeError', () => {
  it('returns true for Stripe-like errors', () => {
    const error = { type: 'StripeCardError', message: 'Card declined' };
    expect(isStripeError(error)).toBe(true);
  });

  it('returns true for StripeInvalidRequestError', () => {
    const error = {
      type: 'StripeInvalidRequestError',
      message: 'Invalid',
      code: 'resource_missing',
    };
    expect(isStripeError(error)).toBe(true);
  });

  it('returns false for non-Stripe type', () => {
    const error = { type: 'ValidationError', message: 'Invalid' };
    expect(isStripeError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isStripeError(null)).toBe(false);
  });

  it('returns false for regular Error', () => {
    expect(isStripeError(new Error('Error'))).toBe(false);
  });
});

describe('tryCatch', () => {
  it('returns data on success', async () => {
    const result = await tryCatch(() => Promise.resolve('success'));
    expect(result).toEqual({ data: 'success', error: null });
  });

  it('returns error on rejection', async () => {
    const result = await tryCatch(() => Promise.reject(new Error('Failed')));
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Failed');
  });

  it('wraps non-Error rejections in Error', async () => {
    const result = await tryCatch(() => Promise.reject('string error'));
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('string error');
  });

  it('handles complex async operations', async () => {
    const asyncOp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id: 1, name: 'Test' };
    };

    const result = await tryCatch(asyncOp);
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.error).toBeNull();
  });
});

describe('sendErrorResponse', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  function mockRes(): any {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('hides 5xx error details in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    sendErrorResponse(res, new Error('Internal DB crash'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'An unexpected error occurred' })
    );
  });

  it('includes requestId when provided', () => {
    const res = mockRes();
    sendErrorResponse(res, new AppError('Not found', 404, 'NOT_FOUND'), 'req-abc-123');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-abc-123' }));
  });

  it('exposes AppError code and details for 4xx errors', () => {
    const res = mockRes();
    sendErrorResponse(res, new AppError('Bad input', 400, 'VALIDATION', { name: ['required'] }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION', details: { name: ['required'] } })
    );
  });

  it('shows full error in development mode for 5xx', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    sendErrorResponse(res, new Error('DB connection failed'));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB connection failed' })
    );
  });
});
