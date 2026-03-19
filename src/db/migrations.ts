import type { SQLiteDatabase } from 'expo-sqlite';

import { APP_DB_VERSION, migrationDefinitions } from '@/db/schema';

async function getCurrentVersion(db: SQLiteDatabase) {
  await db.execAsync('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');

  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    'db_version'
  );

  return row?.value ? Number(row.value) : 0;
}

async function setCurrentVersion(db: SQLiteDatabase, version: number) {
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    'db_version',
    String(version)
  );
}

export async function runMigrations(db: SQLiteDatabase) {
  const currentVersion = await getCurrentVersion(db);

  if (currentVersion >= APP_DB_VERSION) {
    return;
  }

  const pendingMigrations = migrationDefinitions.filter(
    (definition) => definition.version > currentVersion && definition.version <= APP_DB_VERSION
  );

  for (const migration of pendingMigrations) {
    await db.execAsync('BEGIN');

    try {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }

      await setCurrentVersion(db, migration.version);
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
}
