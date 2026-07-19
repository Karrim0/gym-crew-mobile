import * as SQLite from "expo-sqlite";
import type { WorkoutSessionWithDetails } from "@/types";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS workout_cache (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workout_cache_user_status_idx
      ON workout_cache(user_id, status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS key_value_cache (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await ensureColumn(db, "sync_queue", "entity_id", "TEXT");
  await ensureColumn(db, "sync_queue", "last_attempt_at", "TEXT");
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS sync_queue_created_idx ON sync_queue(created_at ASC);
    CREATE INDEX IF NOT EXISTS sync_queue_entity_idx ON sync_queue(entity, entity_id);
  `);
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync("gym-crew.db");
  const db = await databasePromise;
  if (!initializationPromise) initializationPromise = initializeDatabase(db).catch((error) => {
    initializationPromise = null;
    throw error;
  });
  await initializationPromise;
  return db;
}

export async function cacheWorkout(session: WorkoutSessionWithDetails) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO workout_cache (id, user_id, status, updated_at, payload)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    session.id,
    session.userId,
    session.status,
    session.updatedAt,
    JSON.stringify(session),
  );
}

export async function getCachedWorkout(sessionId: string): Promise<WorkoutSessionWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM workout_cache WHERE id = ? LIMIT 1", sessionId);
  if (!row) return null;
  const parsed = parseJson<WorkoutSessionWithDetails>(row.payload);
  if (!parsed) await db.runAsync("DELETE FROM workout_cache WHERE id = ?", sessionId);
  return parsed;
}

export async function getCachedActiveWorkout(userId: string): Promise<WorkoutSessionWithDetails | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; payload: string }>(
    `SELECT id, payload FROM workout_cache WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC`,
    userId,
  );
  for (const row of rows) {
    const parsed = parseJson<WorkoutSessionWithDetails>(row.payload);
    if (parsed) return parsed;
    await db.runAsync("DELETE FROM workout_cache WHERE id = ?", row.id);
  }
  return null;
}

export async function getCachedWorkoutHistory(userId: string, limit = 50) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; payload: string }>(
    `SELECT id, payload FROM workout_cache WHERE user_id = ? AND status = 'completed' ORDER BY updated_at DESC LIMIT ?`,
    userId,
    limit,
  );
  const sessions: WorkoutSessionWithDetails[] = [];
  for (const row of rows) {
    const parsed = parseJson<WorkoutSessionWithDetails>(row.payload);
    if (parsed) sessions.push(parsed);
    else await db.runAsync("DELETE FROM workout_cache WHERE id = ?", row.id);
  }
  return sessions;
}

export async function removeCachedWorkout(sessionId: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM workout_cache WHERE id = ?", sessionId);
}

export async function cacheValue<T>(key: string, value: T) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO key_value_cache (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

export async function readCachedValue<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM key_value_cache WHERE key = ? LIMIT 1", key);
  if (!row) return null;
  const parsed = parseJson<T>(row.value);
  if (parsed === null) await db.runAsync("DELETE FROM key_value_cache WHERE key = ?", key);
  return parsed;
}

export async function removeCachedValue(key: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM key_value_cache WHERE key = ?", key);
}

export async function removeCachedValuesLike(pattern: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM key_value_cache WHERE key LIKE ?", pattern);
}

export async function clearUserLocalData(_userId: string) {
  const db = await getDatabase();
  // A sign-out is a privacy boundary on a shared phone. Clear all app data
  // from SQLite so another account cannot see cached summaries or workouts.
  await db.execAsync(`
    DELETE FROM workout_cache;
    DELETE FROM sync_queue;
    DELETE FROM key_value_cache;
  `);
}
