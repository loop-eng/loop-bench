/**
 * Data processing pipeline using callback pattern.
 * Chains multiple operations together.
 */

type Callback<T> = (error: Error | null, result?: T) => void;

export function validate(input: string, callback: Callback<string>): void {
  setTimeout(() => {
    if (!input || input.trim().length === 0) {
      callback(new Error('Input must not be empty'));
      return;
    }
    callback(null, input.trim());
  }, 5);
}

export function transform(input: string, callback: Callback<string>): void {
  setTimeout(() => {
    const result = input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    callback(null, result);
  }, 5);
}

export function enrich(input: string, callback: Callback<{ slug: string; length: number; hash: number }>): void {
  setTimeout(() => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    callback(null, { slug: input, length: input.length, hash });
  }, 5);
}

export function runPipeline(
  input: string,
  callback: Callback<{ slug: string; length: number; hash: number }>
): void {
  validate(input, (err, validated) => {
    if (err) {
      callback(err);
      return;
    }
    transform(validated!, (err2, transformed) => {
      if (err2) {
        callback(err2);
        return;
      }
      enrich(transformed!, (err3, result) => {
        if (err3) {
          callback(err3);
          return;
        }
        callback(null, result);
      });
    });
  });
}
