import * as SQLite from 'expo-sqlite';

import { ensureDefaultSettings } from '@/db/queries';
import { runMigrations } from '@/db/migrations';
import { ensureSeedData } from '@/db/seed';
import { APP_DB_NAME } from '@/db/schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(APP_DB_NAME);
  }

  return databasePromise;
}

export async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      await ensureDefaultSettings(db);
      await ensureSeedData(db);
    })();
  }

  return initializationPromise;
}
