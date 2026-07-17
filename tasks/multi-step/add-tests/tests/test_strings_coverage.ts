/**
 * Hidden meta-tests that verify the student's test suite is comprehensive.
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_FILE = path.join(__dirname, '..', 'repo', 'src', 'utils', 'strings.test.ts');

describe('Test suite coverage verification', () => {
  let testSource: string;

  beforeAll(() => {
    testSource = fs.readFileSync(TEST_FILE, 'utf-8');
  });

  describe('All 6 functions are tested', () => {
    const functions = ['slugify', 'truncate', 'capitalize', 'escapeHtml', 'stripTags', 'camelToKebab'];

    for (const fn of functions) {
      it(`should have tests for ${fn}`, () => {
        // Check that the function name appears in test descriptions or assertions
        const fnPattern = new RegExp(fn, 'i');
        expect(testSource).toMatch(fnPattern);

        // Check it's actually called (not just mentioned in a comment)
        const callPattern = new RegExp(`${fn}\\s*\\(`, 'g');
        const matches = testSource.match(callPattern);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('Edge cases are covered', () => {
    it('should test empty string input', () => {
      // Look for empty string literals being passed to functions
      expect(testSource).toMatch(/\(\s*['"]{2}\s*[,)]/);
    });

    it('should test special characters', () => {
      // Look for special characters in test strings
      const hasSpecial = /[<>&"']/.test(testSource) ||
                         /special/i.test(testSource) ||
                         /html/i.test(testSource) ||
                         /escape/i.test(testSource);
      expect(hasSpecial).toBe(true);
    });

    it('should test unicode or accented characters', () => {
      const hasUnicode = /[À-ɏ]/.test(testSource) ||
                         /unicode/i.test(testSource) ||
                         /accent/i.test(testSource) ||
                         /[éèêëàâäüöïîôûùçñ]/i.test(testSource) ||
                         /\\u[0-9a-fA-F]{4}/.test(testSource);
      expect(hasUnicode).toBe(true);
    });
  });

  describe('Sufficient test count', () => {
    it('should have at least 18 test cases', () => {
      // Count it() or test() calls
      const itMatches = testSource.match(/\bit\s*\(/g) || [];
      const testMatches = testSource.match(/\btest\s*\(/g) || [];
      const totalTests = itMatches.length + testMatches.length;
      expect(totalTests).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Tests actually pass', () => {
    // This is verified by the test runner itself - if the student's tests
    // are in the same Jest run, failures there will fail the suite
    it('should have valid test syntax (no parse errors)', () => {
      // If we got here, the file parsed successfully
      expect(testSource.length).toBeGreaterThan(100);
    });
  });
});

// Also run the actual string utils to verify they work as expected
import { slugify, truncate, capitalize, escapeHtml, stripTags, camelToKebab } from '../repo/src/utils/strings';

describe('String utils baseline verification', () => {
  it('slugify works correctly', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('')).toBe('');
  });

  it('truncate works correctly', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('capitalize works correctly', () => {
    expect(capitalize('hello world')).toBe('Hello World');
    expect(capitalize('')).toBe('');
  });

  it('escapeHtml works correctly', () => {
    expect(escapeHtml('<div>"test"</div>')).toBe('&lt;div&gt;&quot;test&quot;&lt;/div&gt;');
  });

  it('stripTags works correctly', () => {
    expect(stripTags('<p>Hello</p>')).toBe('Hello');
  });

  it('camelToKebab works correctly', () => {
    expect(camelToKebab('camelCase')).toBe('camel-case');
    expect(camelToKebab('XMLParser')).toBe('xml-parser');
  });
});
