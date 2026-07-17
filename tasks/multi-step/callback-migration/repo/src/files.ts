/**
 * Simulated file system operations using callback pattern.
 */

type Callback<T> = (error: Error | null, result?: T) => void;

const filesystem: Map<string, string> = new Map();

export function readFile(path: string, callback: Callback<string>): void {
  setTimeout(() => {
    const content = filesystem.get(path);
    if (content === undefined) {
      callback(new Error(`File not found: ${path}`));
      return;
    }
    callback(null, content);
  }, 10);
}

export function writeFile(path: string, content: string, callback: Callback<void>): void {
  setTimeout(() => {
    if (!path || path.trim() === '') {
      callback(new Error('Invalid file path'));
      return;
    }
    filesystem.set(path, content);
    callback(null);
  }, 10);
}

export function deleteFile(path: string, callback: Callback<boolean>): void {
  setTimeout(() => {
    if (!filesystem.has(path)) {
      callback(new Error(`File not found: ${path}`));
      return;
    }
    filesystem.delete(path);
    callback(null, true);
  }, 10);
}

export function listFiles(callback: Callback<string[]>): void {
  setTimeout(() => {
    callback(null, Array.from(filesystem.keys()));
  }, 10);
}

export function clearFiles(callback: Callback<void>): void {
  filesystem.clear();
  callback(null);
}
