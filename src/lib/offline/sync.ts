import { supabase } from "@/lib/supabase/client";
import {
  enqueueLocalMutation,
  getDatabase,
  getLocalQueueHealth,
} from "./database";
import { emitSyncEvent } from "./sync-events";
import { getNetworkAvailability } from "./network";
import {
  MAX_SYNC_ATTEMPTS,
  PROCESSING_LEASE_MS,
  compareIsoTimestamps,
  isLikelyTransportError,
  nextRetryAt,
  shouldDeadLetter,
  type SyncEntity,
  type SyncMutation,
  type SyncOperation,
  type SyncQueueStatus,
} from "./sync-policy";
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";

interface QueueRow {
  id: string;
  entity: SyncEntity;
  entity_id: string | null;
  scope_id: string | null;
  operation: SyncOperation;
  payload: string;
  status: SyncQueueStatus;
  attempts: number;
}

export interface SyncResult {
  processed: number;
  pending: number;
  failed: number;
  skipped: boolean;
  lastError: string | null;
  nextRetryAt: string | null;
}

export async function enqueueSync(
  entity: SyncEntity,
  operation: SyncOperation,
  payload: WorkoutSession | WorkoutExercise | WorkoutSet,
  options?: { scopeId?: string | null; ownerUserId?: string | null },
) {
  return enqueueLocalMutation({
    entity,
    operation,
    payload,
    scopeId: options?.scopeId,
    ownerUserId: options?.ownerUserId,
  });
}

function sessionRow(payload: WorkoutSession) {
  return {
    id: payload.id,
    client_id: payload.clientId,
    user_id: payload.userId,
    group_id: payload.groupId,
    split_day_id: payload.splitDayId,
    scheduled_date: payload.scheduledDate,
    status: payload.status,
    notes: payload.notes,
    duration_seconds: payload.durationSeconds,
    started_at: payload.startedAt,
    completed_at: payload.completedAt,
    updated_at: payload.updatedAt,
  };
}

function exerciseRow(payload: WorkoutExercise) {
  return {
    id: payload.id,
    workout_session_id: payload.workoutSessionId,
    exercise_id: payload.exerciseId,
    position: payload.order,
    is_session_only_addition: payload.isSessionOnlyAddition,
    notes: payload.notes,
    target_reps_min: payload.targetRepsMin,
    target_reps_max: payload.targetRepsMax,
  };
}

function setRow(payload: WorkoutSet) {
  return {
    id: payload.id,
    workout_exercise_id: payload.workoutExerciseId,
    set_number: payload.setNumber,
    weight_kg: payload.weightKg,
    reps: payload.reps,
    is_warmup: payload.isWarmup,
    is_completed: payload.isCompleted,
    notes: payload.notes,
    updated_at: payload.updatedAt,
  };
}

async function remoteIsNewer(
  table: "workout_sessions" | "workout_sets",
  id: string,
  localUpdatedAt: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return compareIsoTimestamps(data?.updated_at, localUpdatedAt) > 0;
}

async function processQueueRow(row: QueueRow) {
  const payload = JSON.parse(row.payload) as
    | WorkoutSession
    | WorkoutExercise
    | WorkoutSet;

  if (row.entity === "workoutSession") {
    const value = payload as WorkoutSession;
    if (row.operation === "delete") {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", value.id);
      if (error) throw error;
    } else if (!(await remoteIsNewer("workout_sessions", value.id, value.updatedAt))) {
      const { error } = await supabase.from("workout_sessions").upsert(sessionRow(value));
      if (error) throw error;
    }
    return;
  }

  if (row.entity === "workoutExercise") {
    const value = payload as WorkoutExercise;
    if (row.operation === "delete") {
      const { error } = await supabase.from("workout_exercises").delete().eq("id", value.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("workout_exercises").upsert(exerciseRow(value));
      if (error) throw error;
    }
    return;
  }

  const value = payload as WorkoutSet;
  if (row.operation === "delete") {
    const { error } = await supabase.from("workout_sets").delete().eq("id", value.id);
    if (error) throw error;
  } else if (!(await remoteIsNewer("workout_sets", value.id, value.updatedAt))) {
    const { error } = await supabase.from("workout_sets").upsert(setRow(value));
    if (error) throw error;
  }
}

let activeSync: Promise<SyncResult> | null = null;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function safeQueueHealth() {
  return getLocalQueueHealth().catch(() => ({
    pending: 0,
    failed: 0,
    nextRetryAt: null,
  }));
}

async function recoverExpiredProcessingRows() {
  const db = await getDatabase();
  const expiredBefore = new Date(Date.now() - PROCESSING_LEASE_MS).toISOString();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'failed',
         next_attempt_at = COALESCE(next_attempt_at, ?),
         updated_at = ?
     WHERE status = 'processing'
       AND (last_attempt_at IS NULL OR last_attempt_at <= ?)`,
    now,
    now,
    expiredBefore,
  );
}

async function selectQueueRows(force: boolean) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  return db.getAllAsync<QueueRow>(
    `SELECT id, entity, entity_id, scope_id, operation, payload, status, attempts
     FROM sync_queue
     WHERE status IN ('pending', 'failed')
       AND dead_lettered_at IS NULL
       AND attempts < ?
       AND (? = 1 OR next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY
       CASE entity
         WHEN 'workoutSession' THEN 0
         WHEN 'workoutExercise' THEN 1
         ELSE 2
       END ASC,
       created_at ASC,
       updated_at ASC
     LIMIT 200`,
    MAX_SYNC_ATTEMPTS,
    force ? 1 : 0,
    now,
  );
}

async function markProcessing(rowId: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'processing',
         last_attempt_at = ?,
         updated_at = ?
     WHERE id = ?`,
    now,
    now,
    rowId,
  );
}

async function markFailure(row: QueueRow, error: unknown) {
  const db = await getDatabase();
  const now = new Date();
  const attempts = row.attempts + 1;
  const malformedPayload = error instanceof SyntaxError;
  const deadLetter = malformedPayload || shouldDeadLetter(attempts);
  const message = errorMessage(error);

  await db.runAsync(
    `UPDATE sync_queue
     SET status = ?,
         attempts = ?,
         last_error = ?,
         last_attempt_at = ?,
         next_attempt_at = ?,
         dead_lettered_at = ?,
         updated_at = ?
     WHERE id = ?`,
    deadLetter ? "dead_letter" : "failed",
    attempts,
    message,
    now.toISOString(),
    deadLetter ? null : nextRetryAt(attempts, now),
    deadLetter ? now.toISOString() : null,
    now.toISOString(),
    row.id,
  );

  return { deadLetter, message };
}

async function executeSyncQueue(
  options: { force?: boolean },
): Promise<SyncResult> {
  const availability = await getNetworkAvailability();
  if (availability === "offline") {
    const health = await safeQueueHealth();
    return {
      processed: 0,
      ...health,
      skipped: true,
      lastError: null,
    };
  }

  let session;
  try {
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    session = result.data.session;
  } catch (caught) {
    const lastError = errorMessage(caught);
    const health = await safeQueueHealth();
    emitSyncEvent({ syncing: false, ...health, lastError });
    return { processed: 0, ...health, skipped: false, lastError };
  }

  if (!session) {
    const health = await safeQueueHealth();
    return {
      processed: 0,
      ...health,
      skipped: true,
      lastError: null,
    };
  }

  emitSyncEvent({ syncing: true, lastError: null });

  let processed = 0;
  let lastError: string | null = null;

  try {
    await recoverExpiredProcessingRows();
    const rows = await selectQueueRows(Boolean(options.force));
    const db = await getDatabase();

    for (const row of rows) {
      try {
        await markProcessing(row.id);
        await processQueueRow(row);
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", row.id);
        processed += 1;
      } catch (caught) {
        const failed = await markFailure(row, caught);
        lastError = failed.message;

        // A transport failure usually means every later request would fail too.
        // Stop here so child rows do not burn through their retry budget.
        if (isLikelyTransportError(caught)) break;
      }
    }

    const health = await safeQueueHealth();
    emitSyncEvent({
      syncing: false,
      ...health,
      lastError,
      lastSyncedAt:
        processed > 0 && !lastError ? new Date().toISOString() : undefined,
    });

    return {
      processed,
      ...health,
      skipped: false,
      lastError,
    };
  } catch (caught) {
    lastError = errorMessage(caught);
    const health = await safeQueueHealth();
    emitSyncEvent({ syncing: false, ...health, lastError });
    return {
      processed,
      ...health,
      skipped: false,
      lastError,
    };
  }
}

export function flushSyncQueue(
  options: { force?: boolean } = {},
): Promise<SyncResult> {
  if (activeSync) return activeSync;

  activeSync = executeSyncQueue(options).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export async function pendingSyncCount() {
  return (await getLocalQueueHealth()).pending;
}

export async function failedSyncCount() {
  return (await getLocalQueueHealth()).failed;
}

export async function retryDeadLetterQueue() {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'pending',
         attempts = 0,
         last_error = NULL,
         last_attempt_at = NULL,
         next_attempt_at = NULL,
         dead_lettered_at = NULL,
         updated_at = ?
     WHERE status = 'dead_letter'`,
    now,
  );

  const health = await getLocalQueueHealth();
  emitSyncEvent({ ...health, lastError: null });
  return health;
}

export async function discardDeadLetterQueue() {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM sync_queue WHERE status = 'dead_letter'");
  const health = await getLocalQueueHealth();
  emitSyncEvent({ ...health, lastError: null });
  return health;
}

export async function hasPendingEntitySync(entity: SyncEntity, entityId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM sync_queue
     WHERE entity = ?
       AND entity_id = ?
       AND status <> 'dead_letter'
     LIMIT 1`,
    entity,
    entityId,
  );

  if (row) return true;

  // Compatibility with queue entries created before entity_id was introduced.
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload
     FROM sync_queue
     WHERE entity = ?
       AND entity_id IS NULL
       AND status <> 'dead_letter'`,
    entity,
  );

  return rows.some((item) => {
    try {
      return (JSON.parse(item.payload) as { id?: string }).id === entityId;
    } catch {
      return false;
    }
  });
}

export async function hasPendingWorkoutSync(scopeId: string) {
  const db = await getDatabase();
  const direct = await db.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM sync_queue
     WHERE scope_id = ?
       AND status <> 'dead_letter'
     LIMIT 1`,
    scopeId,
  );
  if (direct) return true;

  const legacyRows = await db.getAllAsync<{
    entity: SyncEntity;
    payload: string;
  }>(
    `SELECT entity, payload
     FROM sync_queue
     WHERE scope_id IS NULL
       AND status <> 'dead_letter'`,
  );

  return legacyRows.some((row) => {
    try {
      const payload = JSON.parse(row.payload) as {
        id?: string;
        workoutSessionId?: string;
      };
      return (
        (row.entity === "workoutSession" && payload.id === scopeId) ||
        (row.entity === "workoutExercise" &&
          payload.workoutSessionId === scopeId)
      );
    } catch {
      return false;
    }
  });
}

export type { SyncEntity, SyncMutation, SyncOperation };
