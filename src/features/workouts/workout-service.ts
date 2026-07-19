import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import {
  cacheWorkout,
  getCachedActiveWorkout,
  getCachedWorkout,
  getCachedWorkoutHistory,
  removeCachedWorkout,
  cacheValue,
  readCachedValue,
} from "@/lib/offline/database";
import { enqueueSync, flushSyncQueue, hasPendingEntitySync } from "@/lib/offline/sync";
import { createId } from "@/lib/utils/id";
import { toISODateOnly } from "@/lib/utils/date";
import type {
  Exercise,
  PreviousPerformanceMap,
  SplitExerciseWithDetails,
  UUID,
  WorkoutExerciseWithDetails,
  WorkoutSessionWithDetails,
  WorkoutSet,
} from "@/types";
import { mapExercise } from "@/features/splits/exercise-service";

type SessionRow = Tables<"workout_sessions">;
type WorkoutExerciseRow = Tables<"workout_exercises">;
type WorkoutSetRow = Tables<"workout_sets">;
type ExerciseRow = Tables<"exercises">;
type ExerciseQueryRow = WorkoutExerciseRow & { exercises: ExerciseRow; workout_sets: WorkoutSetRow[] };
type SessionQueryRow = SessionRow & { workout_exercises: ExerciseQueryRow[] };

const SESSION_SELECT = "*, workout_exercises(*, exercises(*), workout_sets(*))";

export class ActiveWorkoutConflictError extends Error {
  constructor(public readonly activeSession: WorkoutSessionWithDetails) {
    super("A different workout is already in progress.");
    this.name = "ActiveWorkoutConflictError";
  }
}

function mapSet(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
    isWarmup: row.is_warmup,
    isCompleted: row.is_completed,
    isPersonalRecord: false,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkoutExercise(row: ExerciseQueryRow): WorkoutExerciseWithDetails {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    exerciseId: row.exercise_id,
    order: row.position,
    isSessionOnlyAddition: row.is_session_only_addition,
    notes: row.notes,
    targetRepsMin: row.target_reps_min ?? 8,
    targetRepsMax: row.target_reps_max ?? 12,
    exercise: mapExercise(row.exercises),
    sets: [...row.workout_sets].sort((a, b) => a.set_number - b.set_number).map(mapSet),
  };
}

function mapSession(row: SessionQueryRow): WorkoutSessionWithDetails {
  return {
    id: row.id,
    clientId: row.client_id,
    userId: row.user_id,
    groupId: row.group_id,
    splitDayId: row.split_day_id,
    scheduledDate: row.scheduled_date,
    status: row.status,
    notes: row.notes,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    exercises: [...row.workout_exercises].sort((a, b) => a.position - b.position).map(mapWorkoutExercise),
  };
}

function normalizeCachedSession(session: WorkoutSessionWithDetails): WorkoutSessionWithDetails {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      targetRepsMin: exercise.targetRepsMin ?? 8,
      targetRepsMax: exercise.targetRepsMax ?? 12,
      notes: exercise.notes ?? "",
      sets: exercise.sets.map((set) => ({ ...set, notes: set.notes ?? "" })),
    })),
  };
}

async function fetchRemoteSession(sessionId: UUID) {
  const { data, error } = await supabase.from("workout_sessions").select(SESSION_SELECT).eq("id", sessionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const session = mapSession(data as unknown as SessionQueryRow);
  await cacheWorkout(session);
  return session;
}

export async function fetchWorkoutSession(sessionId: UUID) {
  const cached = await getCachedWorkout(sessionId);
  if (cached) return normalizeCachedSession(cached);
  return fetchRemoteSession(sessionId);
}

export async function fetchActiveWorkout(userId: UUID) {
  const cachedLocal = await getCachedActiveWorkout(userId);
  const local = cachedLocal ? normalizeCachedSession(cachedLocal) : null;
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (data) {
      const session = mapSession(data as unknown as SessionQueryRow);
      await cacheWorkout(session);
      return session;
    }

    // A local in-progress session can be a legitimate offline workout. Keep
    // it only while its session mutation is still waiting to reach Supabase.
    if (local && await hasPendingEntitySync("workoutSession", local.id)) return local;

    // Supabase is reachable and confirms there is no active workout. Remove a
    // stale local ghost so it cannot hijack today's Start Workout action.
    if (local) await removeCachedWorkout(local.id);
    return null;
  } catch {
    // Offline/network failure: local data remains the source of truth.
    return local;
  }
}

export async function fetchWorkoutHistory(userId: UUID, limit = 50) {
  const local = (await getCachedWorkoutHistory(userId, limit)).map(normalizeCachedSession);
  const merged = new Map(local.map((session) => [session.id, session]));
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    for (const row of data as unknown as SessionQueryRow[]) {
      const session = mapSession(row);
      const current = merged.get(session.id);
      if (!current || current.updatedAt < session.updatedAt) {
        merged.set(session.id, session);
        await cacheWorkout(session);
      }
    }
  } catch {
    // Local data remains usable while offline.
  }
  return [...merged.values()].sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
}

export async function fetchDailyConsistencyStreak(userId?: UUID) {
  const cacheKey = `daily-streak:${userId ?? "current"}`;
  try {
    const { data, error } = await supabase.rpc("get_daily_consistency_streak");
    if (error) throw error;
    const current = data?.[0]?.current_streak_days;
    const value = typeof current === "number" ? current : 0;
    await cacheValue(cacheKey, value);
    return value;
  } catch (caught) {
    const cached = await readCachedValue<number>(cacheKey);
    if (cached !== null) return cached;
    throw caught;
  }
}

function buildExercise(
  sessionId: UUID,
  template: SplitExerciseWithDetails,
  order: number,
  now: string,
): WorkoutExerciseWithDetails {
  const id = createId();
  return {
    id,
    workoutSessionId: sessionId,
    exerciseId: template.exerciseId,
    order,
    isSessionOnlyAddition: false,
    notes: "",
    targetRepsMin: template.targetRepsMin,
    targetRepsMax: template.targetRepsMax,
    exercise: template.exercise,
    sets: Array.from({ length: template.targetSets }, (_, index) => ({
      id: createId(),
      workoutExerciseId: id,
      setNumber: index + 1,
      weightKg: null,
      reps: null,
      isWarmup: false,
      isCompleted: false,
      isPersonalRecord: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    })),
  };
}

export async function startWorkout(input: {
  userId: UUID;
  groupId: UUID;
  splitDayId: UUID | null;
  exercises: SplitExerciseWithDetails[];
  scheduledDate?: string;
  replaceExisting?: boolean;
}) {
  const scheduledDate = input.scheduledDate ?? toISODateOnly();
  const existing = await fetchActiveWorkout(input.userId).catch(() => getCachedActiveWorkout(input.userId));
  if (existing) {
    const belongsToRequestedWorkout = existing.scheduledDate === scheduledDate
      && existing.splitDayId === input.splitDayId;
    if (belongsToRequestedWorkout) return existing;
    if (!input.replaceExisting) throw new ActiveWorkoutConflictError(existing);
    await cancelWorkout(existing.id);
  }

  const now = new Date().toISOString();
  const sessionId = createId();
  const session: WorkoutSessionWithDetails = {
    id: sessionId,
    clientId: createId(),
    userId: input.userId,
    groupId: input.groupId,
    splitDayId: input.splitDayId,
    scheduledDate,
    status: "in_progress",
    notes: "",
    durationSeconds: 0,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    exercises: input.exercises.map((exercise, index) => buildExercise(sessionId, exercise, index, now)),
  };

  await cacheWorkout(session);
  await enqueueSync("workoutSession", "upsert", session);
  for (const exercise of session.exercises) {
    await enqueueSync("workoutExercise", "upsert", { ...exercise, sets: [] });
    for (const set of exercise.sets) await enqueueSync("workoutSet", "upsert", set);
  }
  void flushSyncQueue();
  return session;
}

async function updateSessionLocal(session: WorkoutSessionWithDetails) {
  await cacheWorkout(session);
  return session;
}

export async function logWorkoutSet(
  sessionId: UUID,
  setId: UUID,
  values: { weightKg: number | null; reps: number; notes?: string; isWarmup?: boolean },
) {
  if (!Number.isInteger(values.reps) || values.reps < 1 || values.reps > 1000) throw new Error("اكتب عدد عدات صحيح.");
  if (values.weightKg !== null && (!Number.isFinite(values.weightKg) || values.weightKg < 0 || values.weightKg > 5000)) {
    throw new Error("اكتب وزن صحيح.");
  }
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة على الجهاز.");
  const currentSet = session.exercises.flatMap((exercise) => exercise.sets).find((set) => set.id === setId);
  if (!currentSet) throw new Error("السِت مش موجودة.");
  const now = new Date().toISOString();
  const updatedSet: WorkoutSet = {
    ...currentSet,
    weightKg: values.weightKg,
    reps: values.reps,
    isWarmup: values.isWarmup ?? currentSet.isWarmup,
    isCompleted: true,
    notes: values.notes?.trim() ?? currentSet.notes,
    updatedAt: now,
  };
  const exercises = session.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => set.id === setId ? updatedSet : set),
  }));
  const updated = { ...session, exercises, updatedAt: now };
  await updateSessionLocal(updated);
  await enqueueSync("workoutSet", "upsert", updatedSet);
  void flushSyncQueue();
  return { session: updated, set: updatedSet };
}

export async function addWorkoutSet(sessionId: UUID, workoutExerciseId: UUID) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  const now = new Date().toISOString();
  const exercise = session.exercises.find((item) => item.id === workoutExerciseId);
  if (!exercise) throw new Error("التمرين مش موجود.");
  const set: WorkoutSet = {
    id: createId(),
    workoutExerciseId,
    setNumber: Math.max(0, ...exercise.sets.map((item) => item.setNumber)) + 1,
    weightKg: null,
    reps: null,
    isWarmup: false,
    isCompleted: false,
    isPersonalRecord: false,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
  const updated = {
    ...session,
    updatedAt: now,
    exercises: session.exercises.map((item) => (item.id === workoutExerciseId ? { ...item, sets: [...item.sets, set] } : item)),
  };
  await updateSessionLocal(updated);
  await enqueueSync("workoutSet", "upsert", set);
  void flushSyncQueue();
  return updated;
}

export async function reorderWorkoutExercises(sessionId: UUID, orderedIds: UUID[]) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  const map = new Map(session.exercises.map((exercise) => [exercise.id, exercise]));
  const exercises = orderedIds.map((id, order) => {
    const exercise = map.get(id);
    if (!exercise) throw new Error("ترتيب التمارين اتغير.");
    return { ...exercise, order };
  });
  const updated = { ...session, exercises, updatedAt: new Date().toISOString() };
  await updateSessionLocal(updated);
  for (const exercise of exercises) await enqueueSync("workoutExercise", "upsert", { ...exercise, sets: [] });
  void flushSyncQueue();
  return updated;
}

export async function finishWorkout(sessionId: UUID, durationSeconds: number) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  const now = new Date().toISOString();
  const completed: WorkoutSessionWithDetails = {
    ...session,
    status: "completed",
    completedAt: now,
    durationSeconds: Math.max(0, Math.floor(durationSeconds)),
    updatedAt: now,
  };
  await cacheWorkout(completed);
  await enqueueSync("workoutSession", "upsert", completed);
  void flushSyncQueue();
  return completed;
}

export async function cancelWorkout(sessionId: UUID) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) return;
  const cancelled: WorkoutSessionWithDetails = {
    ...session,
    status: "cancelled",
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await cacheWorkout(cancelled);
  await enqueueSync("workoutSession", "upsert", cancelled);
  void flushSyncQueue();
}

export async function undoWorkoutSet(sessionId: UUID, setId: UUID) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  const currentSet = session.exercises.flatMap((exercise) => exercise.sets).find((set) => set.id === setId);
  if (!currentSet) throw new Error("السِت مش موجودة.");
  const now = new Date().toISOString();
  const changed: WorkoutSet = {
    ...currentSet,
    weightKg: null,
    reps: null,
    notes: "",
    isCompleted: false,
    isPersonalRecord: false,
    updatedAt: now,
  };
  const exercises = session.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => set.id === setId ? changed : set),
  }));
  const updated = { ...session, exercises, updatedAt: now };
  await updateSessionLocal(updated);
  await enqueueSync("workoutSet", "upsert", changed);
  void flushSyncQueue();
  return updated;
}

export async function fetchPreviousPerformances(
  userId: UUID,
  exerciseIds: UUID[],
  excludeSessionId?: UUID,
): Promise<PreviousPerformanceMap> {
  const remaining = new Set(exerciseIds);
  const result: PreviousPerformanceMap = {};
  const history = await fetchWorkoutHistory(userId, 100);
  for (const session of history) {
    if (session.id === excludeSessionId) continue;
    for (const exercise of session.exercises) {
      if (!remaining.has(exercise.exerciseId)) continue;
      const sets = exercise.sets.filter((set) => set.isCompleted).sort((a, b) => a.setNumber - b.setNumber);
      if (!sets.length) continue;
      result[exercise.exerciseId] = {
        sessionId: session.id,
        scheduledDate: session.scheduledDate,
        completedAt: session.completedAt,
        exerciseNotes: exercise.notes,
        sets,
      };
      remaining.delete(exercise.exerciseId);
    }
    if (!remaining.size) break;
  }
  return result;
}

export function createSessionOnlyExercise(
  sessionId: UUID,
  exercise: Exercise,
  order: number,
  setCount = 3,
): WorkoutExerciseWithDetails {
  const now = new Date().toISOString();
  const workoutExerciseId = createId();
  return {
    id: workoutExerciseId,
    workoutSessionId: sessionId,
    exerciseId: exercise.id,
    order,
    isSessionOnlyAddition: true,
    notes: "",
    targetRepsMin: 8,
    targetRepsMax: 12,
    exercise,
    sets: Array.from({ length: setCount }, (_, index) => ({
      id: createId(),
      workoutExerciseId,
      setNumber: index + 1,
      weightKg: null,
      reps: null,
      isWarmup: false,
      isCompleted: false,
      isPersonalRecord: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    })),
  };
}

export async function addSessionExercise(sessionId: UUID, exercise: Exercise, setCount = 3) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  if (session.exercises.some((item) => item.exerciseId === exercise.id)) throw new Error("التمرين موجود بالفعل في الجلسة.");
  const workoutExercise = createSessionOnlyExercise(sessionId, exercise, session.exercises.length, Math.max(1, setCount));
  const updated = { ...session, exercises: [...session.exercises, workoutExercise], updatedAt: new Date().toISOString() };
  await cacheWorkout(updated);
  await enqueueSync("workoutExercise", "upsert", { ...workoutExercise, sets: [] });
  for (const set of workoutExercise.sets) await enqueueSync("workoutSet", "upsert", set);
  void flushSyncQueue();
  return updated;
}

export async function updateWorkoutExerciseNotes(sessionId: UUID, workoutExerciseId: UUID, notes: string) {
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة.");
  const now = new Date().toISOString();
  const current = session.exercises.find((exercise) => exercise.id === workoutExerciseId);
  if (!current) throw new Error("التمرين مش موجود.");
  const changed: WorkoutExerciseWithDetails = { ...current, notes: notes.trim() };
  const exercises = session.exercises.map((exercise) => exercise.id === workoutExerciseId ? changed : exercise);
  const updated = { ...session, exercises, updatedAt: now };
  await cacheWorkout(updated);
  await enqueueSync("workoutExercise", "upsert", { ...changed, sets: [] });
  void flushSyncQueue();
  return updated;
}
