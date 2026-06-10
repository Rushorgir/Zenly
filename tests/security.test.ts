import { describe, it, expect } from 'vitest';
import { sanitizeUrl, sanitizeUrlSubstrings } from '../backend/utils/sanitize.js';

describe('Security Sanitization Utilities', () => {
  describe('sanitizeUrl', () => {
    it('should allow valid http and https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
    });

    it('should allow safe relative paths', () => {
      expect(sanitizeUrl('/assets/images/user.png')).toBe('/assets/images/user.png');
      expect(sanitizeUrl('/profile')).toBe('/profile');
    });

    it('should block protocol-relative URLs (e.g. //evil.com)', () => {
      expect(sanitizeUrl('//evil.com')).toBe('');
    });

    it('should block javascript: URLs to prevent XSS', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert("xss")')).toBe('');
      expect(sanitizeUrl('   javascript:alert(1)   ')).toBe('');
    });

    it('should block other dangerous protocol schemes', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox("hello")')).toBe('');
    });

    it('should return empty string for invalid/non-string inputs', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
      expect(sanitizeUrl(123 as any)).toBe('');
      expect(sanitizeUrl('')).toBe('');
    });
  });

  describe('sanitizeUrlSubstrings', () => {
    it('should sanitize javascript links in markdown format', () => {
      const markdown = 'Check this [dangerous link](javascript:alert(1)) and this [safe link](https://safe.com).';
      const expected = 'Check this [dangerous link]() and this [safe link](https://safe.com).';
      expect(sanitizeUrlSubstrings(markdown)).toBe(expected);
    });

    it('should sanitize javascript links in HTML attributes', () => {
      const html = 'Click <a href="javascript:alert(1)">here</a> or view <img src="data:image/svg+xml,...">';
      const expected = 'Click <a href="">here</a> or view <img src="">';
      expect(sanitizeUrlSubstrings(html)).toBe(expected);
    });

    it('should strip loose malicious protocol schemes', () => {
      const text = 'Go to javascript:alert(1) or data:text/html,... directly.';
      const expected = 'Go to  or  directly.';
      expect(sanitizeUrlSubstrings(text)).toBe(expected);
    });
  });
});
