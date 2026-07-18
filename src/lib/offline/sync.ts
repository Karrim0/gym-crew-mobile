import * as Network from "expo-network";
import { createId } from "@/lib/utils/id";
import { supabase } from "@/lib/supabase/client";
import { getDatabase } from "./database";
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";

type SyncEntity = "workoutSession" | "workoutExercise" | "workoutSet";
type SyncOperation = "upsert" | "delete";

interface QueueRow {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: string;
  attempts: number;
}

export async function enqueueSync(
  entity: SyncEntity,
  operation: SyncOperation,
  payload: WorkoutSession | WorkoutExercise | WorkoutSet,
) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity, operation, payload, attempts, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    createId(),
    entity,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
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

async function processQueueRow(row: QueueRow) {
  const payload = JSON.parse(row.payload) as WorkoutSession | WorkoutExercise | WorkoutSet;

  if (row.entity === "workoutSession") {
    const value = payload as WorkoutSession;
    if (row.operation === "delete") {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", value.id);
      if (error) throw error;
    } else {
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
  } else {
    const { error } = await supabase.from("workout_sets").upsert(setRow(value));
    if (error) throw error;
  }
}

let syncing = false;

export async function flushSyncQueue() {
  if (syncing) return;
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  syncing = true;
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<QueueRow>(
      "SELECT id, entity, operation, payload, attempts FROM sync_queue ORDER BY created_at ASC LIMIT 200",
    );
    for (const row of rows) {
      try {
        await processQueueRow(row);
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await db.runAsync(
          "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
          message,
          row.id,
        );
        break;
      }
    }
  } finally {
    syncing = false;
  }
}

export async function pendingSyncCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_queue");
  return row?.count ?? 0;
}
