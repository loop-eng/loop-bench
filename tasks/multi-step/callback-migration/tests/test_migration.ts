/**
 * Hidden tests for the callback-to-promise migration.
 * These verify that all files have been converted to async/await.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'repo', 'src');

const MIGRATED_FILES = ['db.ts', 'files.ts', 'network.ts', 'pipeline.ts', 'orchestrator.ts'];

describe('Migration: no callback patterns remain', () => {
  for (const file of MIGRATED_FILES) {
    describe(file, () => {
      let source: string;

      beforeAll(() => {
        source = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
      });

      it('should not have Callback type alias', () => {
        expect(source).not.toMatch(/type\s+Callback/);
      });

      it('should not have callback parameters in exported functions', () => {
        // Match function signatures with callback parameter
        const callbackParamPattern = /export\s+function\s+\w+\([^)]*callback\s*:/;
        expect(source).not.toMatch(callbackParamPattern);
      });

      it('should use async keyword', () => {
        expect(source).toMatch(/async\s+function|async\s*\(/);
      });

      it('should return Promise types', () => {
        expect(source).toMatch(/Promise</);
      });
    });
  }
});

describe('Migration: functional correctness', () => {
  beforeEach(async () => {
    // Dynamic import to handle both callback and promise versions
    const db = await import('../repo/src/db');
    const files = await import('../repo/src/files');
    if (typeof db.dbClear === 'function') {
      const result = db.dbClear();
      if (result && typeof (result as any).then === 'function') {
        await result;
      }
    }
    if (typeof files.clearFiles === 'function') {
      const result = files.clearFiles();
      if (result && typeof (result as any).then === 'function') {
        await result;
      }
    }
  });

  it('db functions should return promises', async () => {
    const db = await import('../repo/src/db');
    const result = db.dbInsert('test-1', 'data');
    expect(result).toBeInstanceOf(Promise);
    const record = await result;
    expect(record).toBeDefined();
    expect(record.id).toBe('test-1');
  });

  it('file functions should return promises', async () => {
    const files = await import('../repo/src/files');
    const writeResult = files.writeFile('/test.txt', 'content');
    expect(writeResult).toBeInstanceOf(Promise);
    await writeResult;

    const readResult = files.readFile('/test.txt');
    expect(readResult).toBeInstanceOf(Promise);
    const content = await readResult;
    expect(content).toBe('content');
  });

  it('network functions should return promises', async () => {
    const network = await import('../repo/src/network');
    const result = network.httpGet('/api/users');
    expect(result).toBeInstanceOf(Promise);
    const response = await result;
    expect(response.status).toBe(200);
  });

  it('pipeline should chain operations correctly', async () => {
    const pipeline = await import('../repo/src/pipeline');
    const result = pipeline.runPipeline('Hello World!');
    expect(result).toBeInstanceOf(Promise);
    const output = await result;
    expect(output.slug).toBe('hello-world');
    expect(output.length).toBeGreaterThan(0);
  });

  it('pipeline should reject on empty input', async () => {
    const pipeline = await import('../repo/src/pipeline');
    await expect(pipeline.runPipeline('')).rejects.toThrow('empty');
  });

  it('orchestrator should coordinate async operations', async () => {
    const orchestrator = await import('../repo/src/orchestrator');
    const result = orchestrator.fetchAndStore('/api/config', 'config-1');
    expect(result).toBeInstanceOf(Promise);
    const data = await result;
    expect(data).toBeDefined();
    expect(JSON.parse(data)).toHaveProperty('theme');
  });
});
