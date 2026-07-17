/**
 * Orchestrator that coordinates multiple async callback operations.
 */

import { dbInsert, dbFind, dbClear } from './db';
import { writeFile, readFile, clearFiles } from './files';
import { httpGet, parseJson } from './network';

type Callback<T> = (error: Error | null, result?: T) => void;

export function fetchAndStore(url: string, recordId: string, callback: Callback<string>): void {
  httpGet(url, (err, response) => {
    if (err) {
      callback(err);
      return;
    }
    parseJson(response!.body, (err2, data) => {
      if (err2) {
        callback(err2);
        return;
      }
      const serialized = JSON.stringify(data);
      dbInsert(recordId, serialized, (err3, record) => {
        if (err3) {
          callback(err3);
          return;
        }
        callback(null, record!.data);
      });
    });
  });
}

export function storeAndBackup(
  recordId: string,
  data: string,
  backupPath: string,
  callback: Callback<{ dbId: string; backupFile: string }>
): void {
  dbInsert(recordId, data, (err, record) => {
    if (err) {
      callback(err);
      return;
    }
    writeFile(backupPath, data, (err2) => {
      if (err2) {
        callback(err2);
        return;
      }
      callback(null, { dbId: record!.id, backupFile: backupPath });
    });
  });
}

export function loadFromBackup(
  backupPath: string,
  recordId: string,
  callback: Callback<string>
): void {
  readFile(backupPath, (err, content) => {
    if (err) {
      callback(err);
      return;
    }
    dbInsert(recordId, content!, (err2, record) => {
      if (err2) {
        callback(err2);
        return;
      }
      callback(null, record!.data);
    });
  });
}

export function cleanAll(callback: Callback<void>): void {
  dbClear((err) => {
    if (err) {
      callback(err);
      return;
    }
    clearFiles((err2) => {
      if (err2) {
        callback(err2);
        return;
      }
      callback(null);
    });
  });
}
