/**
 * Simulated network operations using callback pattern.
 */

type Callback<T> = (error: Error | null, result?: T) => void;

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

const endpoints: Map<string, { status: number; body: string }> = new Map([
  ['/api/users', { status: 200, body: JSON.stringify([{ id: 1, name: 'Alice' }]) }],
  ['/api/config', { status: 200, body: JSON.stringify({ theme: 'dark', lang: 'en' }) }],
]);

export function httpGet(url: string, callback: Callback<HttpResponse>): void {
  setTimeout(() => {
    const endpoint = endpoints.get(url);
    if (!endpoint) {
      callback(new Error(`404: Endpoint not found: ${url}`));
      return;
    }
    callback(null, {
      status: endpoint.status,
      body: endpoint.body,
      headers: { 'content-type': 'application/json' },
    });
  }, 10);
}

export function httpPost(url: string, data: string, callback: Callback<HttpResponse>): void {
  setTimeout(() => {
    if (!url || !data) {
      callback(new Error('URL and data are required'));
      return;
    }
    callback(null, {
      status: 201,
      body: JSON.stringify({ received: JSON.parse(data), id: 'new-1' }),
      headers: { 'content-type': 'application/json' },
    });
  }, 10);
}

export function parseJson(raw: string, callback: Callback<any>): void {
  setTimeout(() => {
    try {
      const parsed = JSON.parse(raw);
      callback(null, parsed);
    } catch (err) {
      callback(new Error(`Failed to parse JSON: ${(err as Error).message}`));
    }
  }, 5);
}
