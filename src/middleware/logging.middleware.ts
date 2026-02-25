import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Add unique request ID to each request for traceability
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

/**
 * Simple structured logger
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      })
    );
  },

  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      })
    );
  },

  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            }
          : undefined,
        ...meta,
      })
    );
  },

  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        JSON.stringify({
          level: 'debug',
          timestamp: new Date().toISOString(),
          message,
          ...meta,
        })
      );
    }
  },
};

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log after response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', undefined, logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

/**
 * Enhanced global error handler
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error', err, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    body: process.env.NODE_ENV !== 'production' ? req.body : undefined,
  });

  // Don't expose error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      requestId: req.requestId,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      requestId: req.requestId,
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? err.message : 'An unexpected error occurred',
    stack: isDev ? err.stack : undefined,
    requestId: req.requestId,
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId,
  });
}
