import * as SQLite from "expo-sqlite";
import type { WorkoutSessionWithDetails } from "@/types";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initialized = false;

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export async function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync("gym-crew.db");
  const db = await databasePromise;
  if (!initialized) {
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
    initialized = true;
  }
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
  return row ? (JSON.parse(row.payload) as WorkoutSessionWithDetails) : null;
}

export async function getCachedActiveWorkout(userId: string): Promise<WorkoutSessionWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM workout_cache WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1`,
    userId,
  );
  return row ? (JSON.parse(row.payload) as WorkoutSessionWithDetails) : null;
}

export async function getCachedWorkoutHistory(userId: string, limit = 50) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM workout_cache WHERE user_id = ? AND status = 'completed' ORDER BY updated_at DESC LIMIT ?`,
    userId,
    limit,
  );
  return rows.map((row) => JSON.parse(row.payload) as WorkoutSessionWithDetails);
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
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function removeCachedValue(key: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM key_value_cache WHERE key = ?", key);
}

export async function removeCachedValuesLike(pattern: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM key_value_cache WHERE key LIKE ?", pattern);
}

export async function clearUserLocalData(userId: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM workout_cache WHERE user_id = ?", userId);
  await db.runAsync("DELETE FROM sync_queue");
  await db.runAsync("DELETE FROM key_value_cache WHERE key LIKE ?", `%${userId}%`);
}
