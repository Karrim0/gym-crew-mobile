import * as Network from "expo-network";
import { createId } from "@/lib/utils/id";
import { supabase } from "@/lib/supabase/client";
import { getDatabase } from "./database";
import { emitSyncEvent } from "./sync-events";
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";

export type SyncEntity = "workoutSession" | "workoutExercise" | "workoutSet";
type SyncOperation = "upsert" | "delete";

interface QueueRow {
  id: string;
  entity: SyncEntity;
  entity_id: string | null;
  operation: SyncOperation;
  payload: string;
  attempts: number;
}

export interface SyncResult {
  processed: number;
  pending: number;
  skipped: boolean;
  lastError: string | null;
}

export async function enqueueSync(entity: SyncEntity, operation: SyncOperation, payload: WorkoutSession | WorkoutExercise | WorkoutSet) {
  const db = await getDatabase();
  const entityId = payload.id;
  // Keep only the newest pending mutation for the same row. This makes retries
  // idempotent and avoids replaying every keystroke after a long offline session.
  await db.runAsync("DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?", entity, entityId);
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity, entity_id, operation, payload, attempts, last_error, last_attempt_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?)`,
    createId(),
    entity,
    entityId,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
  emitSyncEvent({ pending: await pendingSyncCount() });
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
    updated_at: payload.updatedAt,
  };
}

async function remoteIsNewer(table: "workout_sessions" | "workout_sets", id: string, localUpdatedAt: string) {
  const { data, error } = await supabase.from(table).select("updated_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return Boolean(data?.updated_at && data.updated_at > localUpdatedAt);
}

async function processQueueRow(row: QueueRow) {
  const payload = JSON.parse(row.payload) as WorkoutSession | WorkoutExercise | WorkoutSet;
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

let syncing = false;

export async function flushSyncQueue(): Promise<SyncResult> {
  if (syncing) return { processed: 0, pending: await pendingSyncCount(), skipped: true, lastError: null };
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) {
    return { processed: 0, pending: await pendingSyncCount(), skipped: true, lastError: null };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { processed: 0, pending: await pendingSyncCount(), skipped: true, lastError: null };

  syncing = true;
  emitSyncEvent({ syncing: true, lastError: null });
  let processed = 0;
  let lastError: string | null = null;
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<QueueRow>(
      "SELECT id, entity, entity_id, operation, payload, attempts FROM sync_queue WHERE attempts < 10 ORDER BY created_at ASC LIMIT 200",
    );
    for (const row of rows) {
      try {
        await db.runAsync("UPDATE sync_queue SET last_attempt_at = ? WHERE id = ?", new Date().toISOString(), row.id);
        await processQueueRow(row);
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", row.id);
        processed += 1;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await db.runAsync(
          "UPDATE sync_queue SET attempts = attempts + 1, last_error = ?, last_attempt_at = ? WHERE id = ?",
          lastError,
          new Date().toISOString(),
          row.id,
        );
        break;
      }
    }
    const pending = await pendingSyncCount();
    emitSyncEvent({ syncing: false, pending, lastError, lastSyncedAt: !lastError ? new Date().toISOString() : null });
    return { processed, pending, skipped: false, lastError };
  } finally {
    syncing = false;
  }
}

export async function pendingSyncCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_queue");
  return row?.count ?? 0;
}

export async function hasPendingEntitySync(entity: SyncEntity, entityId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM sync_queue WHERE entity = ? AND entity_id = ? LIMIT 1",
    entity,
    entityId,
  );
  if (row) return true;
  // Compatibility with queue entries created before entity_id was introduced.
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM sync_queue WHERE entity = ? AND entity_id IS NULL", entity);
  return rows.some((item) => {
    try { return (JSON.parse(item.payload) as { id?: string }).id === entityId; } catch { return false; }
  });
}
