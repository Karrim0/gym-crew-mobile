import * as SQLite from "expo-sqlite";
import { createId } from "@/lib/utils/id";
import { emitSyncEvent } from "./sync-events";
import {
  syncEntityId,
  syncIdempotencyKey,
  syncOwnerUserId,
  syncScopeId,
  type SyncEntity,
  type SyncMutation,
  type SyncQueueStatus,
} from "./sync-policy";
import type { WorkoutSessionWithDetails } from "@/types";

const LOCAL_DATABASE_VERSION = 4;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

interface LegacyQueueRow {
  id: string;
  entity: SyncEntity;
  entity_id: string | null;
  idempotency_key: string | null;
  owner_user_id: string | null;
  scope_id: string | null;
  payload: string;
  created_at: string;
}

export interface LocalQueueHealth {
  pending: number;
  failed: number;
  nextRetryAt: string | null;
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function backfillSyncQueue(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<LegacyQueueRow>(
    `SELECT id, entity, entity_id, idempotency_key, owner_user_id, scope_id, payload, created_at
     FROM sync_queue
     ORDER BY created_at ASC, id ASC`,
  );

  const latestByKey = new Map<string, string>();

  for (const row of rows) {
    const payload = parseJson<unknown>(row.payload);
    const entityId = row.entity_id ?? syncEntityId(payload) ?? row.id;
    const idempotencyKey = row.idempotency_key ?? syncIdempotencyKey(row.entity, entityId);
    const scopeId = row.scope_id ?? syncScopeId(row.entity, payload);
    const ownerUserId = row.owner_user_id ?? syncOwnerUserId(payload);

    const previousId = latestByKey.get(idempotencyKey);
    if (previousId && previousId !== row.id) {
      await db.runAsync("DELETE FROM sync_queue WHERE id = ?", previousId);
    }

    latestByKey.set(idempotencyKey, row.id);
    await db.runAsync(
      `UPDATE sync_queue
       SET entity_id = ?,
           idempotency_key = ?,
           scope_id = ?,
           owner_user_id = ?,
           status = COALESCE(status, 'pending'),
           updated_at = COALESCE(updated_at, created_at)
       WHERE id = ?`,
      entityId,
      idempotencyKey,
      scopeId,
      ownerUserId,
      row.id,
    );
  }
}

async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS workout_cache (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT,
      owner_user_id TEXT,
      scope_id TEXT,
      entity TEXT NOT NULL,
      entity_id TEXT,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TEXT,
      next_attempt_at TEXT,
      dead_lettered_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS key_value_cache (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await ensureColumn(db, "sync_queue", "entity_id", "TEXT");
  await ensureColumn(db, "sync_queue", "idempotency_key", "TEXT");
  await ensureColumn(db, "sync_queue", "owner_user_id", "TEXT");
  await ensureColumn(db, "sync_queue", "scope_id", "TEXT");
  await ensureColumn(db, "sync_queue", "status", "TEXT NOT NULL DEFAULT 'pending'");
  await ensureColumn(db, "sync_queue", "last_attempt_at", "TEXT");
  await ensureColumn(db, "sync_queue", "next_attempt_at", "TEXT");
  await ensureColumn(db, "sync_queue", "dead_lettered_at", "TEXT");
  await ensureColumn(db, "sync_queue", "updated_at", "TEXT");

  await backfillSyncQueue(db);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS workout_cache_user_status_idx
      ON workout_cache(user_id, status, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS sync_queue_idempotency_idx
      ON sync_queue(idempotency_key);
    CREATE INDEX IF NOT EXISTS sync_queue_due_idx
      ON sync_queue(status, next_attempt_at, created_at);
    CREATE INDEX IF NOT EXISTS sync_queue_scope_idx
      ON sync_queue(scope_id, status);
    CREATE INDEX IF NOT EXISTS sync_queue_owner_idx
      ON sync_queue(owner_user_id, status);
    CREATE INDEX IF NOT EXISTS sync_queue_entity_idx
      ON sync_queue(entity, entity_id);
    PRAGMA user_version = ${LOCAL_DATABASE_VERSION};
  `);
}

export async function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync("gym-crew.db");
  const db = await databasePromise;

  if (!initializationPromise) {
    initializationPromise = initializeDatabase(db).catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
  return db;
}

async function cacheWorkoutWithDatabase(
  db: SQLite.SQLiteDatabase,
  session: WorkoutSessionWithDetails,
) {
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

async function queueMutationWithDatabase(
  db: SQLite.SQLiteDatabase,
  mutation: SyncMutation,
  timestamp: string,
) {
  const entityId = syncEntityId(mutation.payload);
  if (!entityId) throw new Error(`Cannot queue ${mutation.entity} without an id.`);

  const idempotencyKey = syncIdempotencyKey(mutation.entity, entityId);
  const scopeId = syncScopeId(mutation.entity, mutation.payload, mutation.scopeId);
  const ownerUserId = syncOwnerUserId(mutation.payload, mutation.ownerUserId);

  await db.runAsync(
    `INSERT INTO sync_queue (
       id,
       idempotency_key,
       owner_user_id,
       scope_id,
       entity,
       entity_id,
       operation,
       payload,
       status,
       attempts,
       last_error,
       last_attempt_at,
       next_attempt_at,
       dead_lettered_at,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       owner_user_id = COALESCE(excluded.owner_user_id, sync_queue.owner_user_id),
       scope_id = COALESCE(excluded.scope_id, sync_queue.scope_id),
       entity_id = excluded.entity_id,
       operation = excluded.operation,
       payload = excluded.payload,
       status = 'pending',
       attempts = 0,
       last_error = NULL,
       last_attempt_at = NULL,
       next_attempt_at = NULL,
       dead_lettered_at = NULL,
       updated_at = excluded.updated_at`,
    createId(),
    idempotencyKey,
    ownerUserId,
    scopeId,
    mutation.entity,
    entityId,
    mutation.operation,
    JSON.stringify(mutation.payload),
    timestamp,
    timestamp,
  );
}

async function queueHealthWithDatabase(db: SQLite.SQLiteDatabase): Promise<LocalQueueHealth> {
  const row = await db.getFirstAsync<{
    pending: number | null;
    failed: number | null;
    next_retry_at: string | null;
  }>(
    `SELECT
       SUM(CASE WHEN status <> 'dead_letter' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS failed,
       MIN(CASE
         WHEN status IN ('pending', 'failed') THEN next_attempt_at
         ELSE NULL
       END) AS next_retry_at
     FROM sync_queue`,
  );

  return {
    pending: Number(row?.pending ?? 0),
    failed: Number(row?.failed ?? 0),
    nextRetryAt: row?.next_retry_at ?? null,
  };
}

export async function getLocalQueueHealth() {
  return queueHealthWithDatabase(await getDatabase());
}

export async function cacheWorkout(session: WorkoutSessionWithDetails) {
  await cacheWorkoutWithDatabase(await getDatabase(), session);
}

export async function commitWorkoutMutation(
  session: WorkoutSessionWithDetails,
  mutations: SyncMutation[],
) {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await cacheWorkoutWithDatabase(db, session);
    for (const mutation of mutations) {
      await queueMutationWithDatabase(db, mutation, timestamp);
    }
  });

  const health = await queueHealthWithDatabase(db);
  emitSyncEvent(health);
  return health;
}

export async function enqueueLocalMutation(mutation: SyncMutation) {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await queueMutationWithDatabase(db, mutation, timestamp);
  });

  const health = await queueHealthWithDatabase(db);
  emitSyncEvent(health);
  return health;
}

export async function getCachedWorkout(
  sessionId: string,
): Promise<WorkoutSessionWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM workout_cache WHERE id = ? LIMIT 1",
    sessionId,
  );
  if (!row) return null;

  const parsed = parseJson<WorkoutSessionWithDetails>(row.payload);
  if (!parsed) await db.runAsync("DELETE FROM workout_cache WHERE id = ?", sessionId);
  return parsed;
}

export async function getCachedActiveWorkout(
  userId: string,
): Promise<WorkoutSessionWithDetails | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; payload: string }>(
    `SELECT id, payload
     FROM workout_cache
     WHERE user_id = ? AND status = 'in_progress'
     ORDER BY updated_at DESC`,
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
    `SELECT id, payload
     FROM workout_cache
     WHERE user_id = ? AND status = 'completed'
     ORDER BY updated_at DESC
     LIMIT ?`,
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
    `INSERT INTO key_value_cache (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

export async function readCachedValue<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM key_value_cache WHERE key = ? LIMIT 1",
    key,
  );
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
  await db.withTransactionAsync(async () => {
    // A sign-out is a privacy boundary on a shared phone. Clear all app data
    // from SQLite so another account cannot see cached summaries or workouts.
    await db.execAsync(`
      DELETE FROM workout_cache;
      DELETE FROM sync_queue;
      DELETE FROM key_value_cache;
    `);
  });
  emitSyncEvent({ pending: 0, failed: 0, nextRetryAt: null, lastError: null });
}

export { LOCAL_DATABASE_VERSION };
export type { SyncMutation, SyncQueueStatus };
