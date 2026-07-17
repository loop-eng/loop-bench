/**
 * Simulated database operations using callback pattern.
 */

type Callback<T> = (error: Error | null, result?: T) => void;

interface Record {
  id: string;
  data: string;
  timestamp: number;
}

const store: Map<string, Record> = new Map();

export function dbInsert(id: string, data: string, callback: Callback<Record>): void {
  setTimeout(() => {
    if (store.has(id)) {
      callback(new Error(`Record with id '${id}' already exists`));
      return;
    }
    const record: Record = { id, data, timestamp: Date.now() };
    store.set(id, record);
    callback(null, record);
  }, 10);
}

export function dbFind(id: string, callback: Callback<Record>): void {
  setTimeout(() => {
    const record = store.get(id);
    if (!record) {
      callback(new Error(`Record '${id}' not found`));
      return;
    }
    callback(null, record);
  }, 10);
}

export function dbUpdate(id: string, data: string, callback: Callback<Record>): void {
  setTimeout(() => {
    const record = store.get(id);
    if (!record) {
      callback(new Error(`Record '${id}' not found`));
      return;
    }
    const updated: Record = { ...record, data, timestamp: Date.now() };
    store.set(id, updated);
    callback(null, updated);
  }, 10);
}

export function dbDelete(id: string, callback: Callback<boolean>): void {
  setTimeout(() => {
    if (!store.has(id)) {
      callback(new Error(`Record '${id}' not found`));
      return;
    }
    store.delete(id);
    callback(null, true);
  }, 10);
}

export function dbClear(callback: Callback<void>): void {
  store.clear();
  callback(null);
}
