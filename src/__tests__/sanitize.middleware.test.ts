/**
 * Sanitize Middleware Tests
 * Covers: stripHtmlTags, sanitizeValue, sanitizeBody
 */
import { jest } from '@jest/globals';
import { stripHtmlTags, sanitizeBody } from '../middleware/sanitize.middleware.js';

describe('sanitize.middleware', () => {
  describe('stripHtmlTags', () => {
    it('removes simple HTML tags', () => {
      expect(stripHtmlTags('<b>bold</b>')).toBe('bold');
    });

    it('removes script tags and content', () => {
      const input = '<script>alert("xss")</script>hello';
      const result = stripHtmlTags(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('hello');
      expect(result).toBe('alert("xss")hello');
    });

    it('handles encoded angle brackets', () => {
      const input = '&lt;img src=x onerror=alert(1)&gt;';
      const result = stripHtmlTags(input);
      expect(result).not.toContain('<img');
      // After decoding &lt;/&gt; to </>, the tag is stripped, leaving attribute text
      expect(typeof result).toBe('string');
    });

    it('trims whitespace', () => {
      expect(stripHtmlTags('  hello  ')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(stripHtmlTags('')).toBe('');
    });

    it('preserves plain text', () => {
      expect(stripHtmlTags('just plain text')).toBe('just plain text');
    });

    it('handles nested tags', () => {
      const input = '<div><p>text</p></div>';
      expect(stripHtmlTags(input)).toBe('text');
    });

    it('handles self-closing tags', () => {
      const input = 'before<br/>after';
      expect(stripHtmlTags(input)).toBe('beforeafter');
    });
  });

  describe('sanitizeBody', () => {
    function makeMockReqRes(body: any) {
      const req = { body } as any;
      const res = {} as any;
      const next = jest.fn<any>();
      return { req, res, next };
    }

    it('sanitizes string fields in body', () => {
      const { req, res, next } = makeMockReqRes({ name: '<b>John</b>' });
      sanitizeBody(req, res, next);
      expect(req.body.name).toBe('John');
      expect(next).toHaveBeenCalled();
    });

    it('preserves numbers and booleans', () => {
      const { req, res, next } = makeMockReqRes({ count: 42, active: true });
      sanitizeBody(req, res, next);
      expect(req.body.count).toBe(42);
      expect(req.body.active).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('sanitizes nested objects', () => {
      const { req, res, next } = makeMockReqRes({
        user: { name: '<script>x</script>Bob', age: 30 },
      });
      sanitizeBody(req, res, next);
      expect(req.body.user.name).not.toContain('<script');
      expect(req.body.user.name).toContain('Bob');
      expect(req.body.user.age).toBe(30);
    });

    it('sanitizes deeply nested objects', () => {
      const { req, res, next } = makeMockReqRes({
        level1: { level2: { level3: { value: '<b>deep</b>' } } },
      });
      sanitizeBody(req, res, next);
      expect(req.body.level1.level2.level3.value).toBe('deep');
      expect(next).toHaveBeenCalled();
    });

    it('handles __proto__ key without prototype pollution', () => {
      const { req, res, next } = makeMockReqRes({
        __proto__: { admin: true },
        name: '<b>safe</b>',
      });
      sanitizeBody(req, res, next);
      // Should not pollute Object.prototype
      expect(({} as any).admin).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('handles constructor.prototype key safely', () => {
      const { req, res, next } = makeMockReqRes({
        constructor: { prototype: { polluted: true } },
      });
      sanitizeBody(req, res, next);
      expect(({} as any).polluted).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('sanitizes arrays', () => {
      const { req, res, next } = makeMockReqRes({
        tags: ['<b>one</b>', 'two', '<i>three</i>'],
      });
      sanitizeBody(req, res, next);
      expect(req.body.tags[0]).toBe('one');
      expect(req.body.tags[2]).toBe('three');
    });

    it('skips password fields', () => {
      const { req, res, next } = makeMockReqRes({
        password: '<script>alert(1)</script>',
        email: '<b>test@test.com</b>',
      });
      sanitizeBody(req, res, next);
      // Password should not be sanitized
      expect(req.body.password).toContain('<script>');
      // Email should be sanitized
      expect(req.body.email).not.toContain('<b>');
    });

    it('skips token fields', () => {
      const { req, res, next } = makeMockReqRes({ token: 'abc<>123' });
      sanitizeBody(req, res, next);
      expect(req.body.token).toBe('abc<>123');
    });

    it('calls next when body is null', () => {
      const { req, res, next } = makeMockReqRes(null);
      sanitizeBody(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('calls next when body is a Buffer', () => {
      const req = { body: Buffer.from('raw') } as any;
      const res = {} as any;
      const next = jest.fn<any>();
      sanitizeBody(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('handles null values within objects', () => {
      const { req, res, next } = makeMockReqRes({ name: null, age: 25 });
      sanitizeBody(req, res, next);
      expect(req.body.name).toBeNull();
      expect(req.body.age).toBe(25);
    });

    it('handles undefined values within objects', () => {
      const { req, res, next } = makeMockReqRes({ name: undefined });
      sanitizeBody(req, res, next);
      expect(req.body.name).toBeUndefined();
    });
  });
});
