/**
 * Hidden tests for the add-tests task.
 * Verify the agent wrote a comprehensive test suite for the strings module.
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_FILE = path.join(__dirname, '..', 'repo', 'src', 'utils', 'strings.test.ts');

describe('Test suite coverage verification', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(TEST_FILE, 'utf-8');
  });

  const REQUIRED_FUNCTIONS = [
    'slugify',
    'truncate',
    'capitalize',
    'escapeHtml',
    'stripTags',
    'camelToKebab',
  ];

  describe('All six functions are tested', () => {
    for (const fn of REQUIRED_FUNCTIONS) {
      it(`should have tests referencing "${fn}"`, () => {
        // The function name should appear in the test file (in describe, it, or assertion calls)
        expect(source).toContain(fn);

        // Check that the function is actually called, not just imported
        const callPattern = new RegExp(`${fn}\\s*\\(`);
        expect(source).toMatch(callPattern);
      });
    }
  });

  describe('Edge cases are tested', () => {
    it('should test empty string input for at least 3 functions', () => {
      // Count occurrences of empty-string test patterns
      const emptyPatterns = [
        /['"](?:''|"")['"]|['"]\s*['"]/g,          // literal empty strings
        /\(\s*''\s*\)|`\s*`|\(\s*""\s*\)/g,         // function calls with empty string
      ];

      let emptyTestCount = 0;
      for (const pattern of emptyPatterns) {
        const matches = source.match(pattern);
        if (matches) {
          emptyTestCount += matches.length;
        }
      }
      expect(emptyTestCount).toBeGreaterThanOrEqual(3);
    });

    it('should test special characters or HTML entities', () => {
      // Tests should include HTML-related characters or special chars
      const hasSpecialChars =
        source.includes('<') ||
        source.includes('&amp;') ||
        source.includes('&lt;') ||
        source.includes('&gt;') ||
        source.includes('&quot;') ||
        source.includes('&#39;') ||
        source.includes('special');
      expect(hasSpecialChars).toBe(true);
    });
  });

  describe('Test count verification', () => {
    it('should have at least 18 test cases', () => {
      // Count it() or test() calls
      const itCalls = source.match(/\bit\s*\(/g) || [];
      const testCalls = source.match(/\btest\s*\(/g) || [];
      const totalTests = itCalls.length + testCalls.length;
      expect(totalTests).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Tests pass against existing implementation', () => {
    // Dynamically import and run the actual string functions to verify
    // the implementation matches what the tests expect
    let strings: any;

    beforeAll(async () => {
      strings = await import('../repo/src/utils/strings');
    });

    it('slugify should work correctly', () => {
      expect(strings.slugify('Hello World')).toBe('hello-world');
      expect(strings.slugify('')).toBe('');
    });

    it('truncate should work correctly', () => {
      expect(strings.truncate('Hello, World!', 10)).toBe('Hello, ...');
      expect(strings.truncate('Hi', 10)).toBe('Hi');
    });

    it('capitalize should work correctly', () => {
      expect(strings.capitalize('hello')).toBe('Hello');
      expect(strings.capitalize('')).toBe('');
    });

    it('escapeHtml should work correctly', () => {
      expect(strings.escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(strings.escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('stripTags should work correctly', () => {
      expect(strings.stripTags('<p>Hello</p>')).toBe('Hello');
      expect(strings.stripTags('no tags')).toBe('no tags');
    });

    it('camelToKebab should work correctly', () => {
      expect(strings.camelToKebab('camelCase')).toBe('camel-case');
      expect(strings.camelToKebab('lowercase')).toBe('lowercase');
    });
  });
});
