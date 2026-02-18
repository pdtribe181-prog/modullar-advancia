import { jest } from '@jest/globals';
import { logger } from '../middleware/logging.middleware.js';

describe('Logger', () => {
  // Capture console output for testing
  const originalConsole = { ...console };
  let consoleOutput: { level: string; data: string }[] = [];

  beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn((data: string) => {
      consoleOutput.push({ level: 'log', data });
    });
    console.warn = jest.fn((data: string) => {
      consoleOutput.push({ level: 'warn', data });
    });
    console.error = jest.fn((data: string) => {
      consoleOutput.push({ level: 'error', data });
    });
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('info', () => {
    it('logs info level messages', () => {
      logger.info('Test info message');
      expect(consoleOutput).toHaveLength(1);
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.level).toBe('info');
      expect(logged.message).toBe('Test info message');
      expect(logged.timestamp).toBeDefined();
    });

    it('includes metadata in info logs', () => {
      logger.info('User action', { userId: '123', action: 'login' });
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.userId).toBe('123');
      expect(logged.action).toBe('login');
    });
  });

  describe('warn', () => {
    it('logs warn level messages', () => {
      logger.warn('Test warning');
      expect(consoleOutput).toHaveLength(1);
      expect(consoleOutput[0].level).toBe('warn');
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.level).toBe('warn');
      expect(logged.message).toBe('Test warning');
    });
  });

  describe('error', () => {
    it('logs error level messages', () => {
      logger.error('Test error');
      expect(consoleOutput[0].level).toBe('error');
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.level).toBe('error');
      expect(logged.message).toBe('Test error');
    });

    it('includes error details when provided', () => {
      const error = new Error('Something went wrong');
      logger.error('Operation failed', error);
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.error).toBeDefined();
      expect(logged.error.name).toBe('Error');
      expect(logged.error.message).toBe('Something went wrong');
    });

    it('includes metadata with error', () => {
      const error = new Error('DB error');
      logger.error('Database operation failed', error, { operation: 'insert', table: 'users' });
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.operation).toBe('insert');
      expect(logged.table).toBe('users');
    });
  });

  describe('debug', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('logs debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      logger.debug('Debug message');
      expect(consoleOutput).toHaveLength(1);
      const logged = JSON.parse(consoleOutput[0].data);
      expect(logged.level).toBe('debug');
    });

    it('does not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      logger.debug('Debug message');
      expect(consoleOutput).toHaveLength(0);
    });
  });

  describe('structured output', () => {
    it('outputs valid JSON', () => {
      logger.info('JSON test');
      expect(() => JSON.parse(consoleOutput[0].data)).not.toThrow();
    });

    it('includes ISO timestamp', () => {
      logger.info('Timestamp test');
      const logged = JSON.parse(consoleOutput[0].data);
      // ISO 8601 format check
      expect(logged.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
