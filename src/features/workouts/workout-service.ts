import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import {
  cacheWorkout,
  getCachedActiveWorkout,
  getCachedWorkout,
  getCachedWorkoutHistory,
} from "@/lib/offline/database";
import { enqueueSync, flushSyncQueue } from "@/lib/offline/sync";
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

async function fetchRemoteSession(sessionId: UUID) {
  const { data, error } = await supabase.from("workout_sessions").select(SESSION_SELECT).eq("id", sessionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const session = mapSession(data as unknown as SessionQueryRow);
  await cacheWorkout(session);
  return session;
}

export async function fetchWorkoutSession(sessionId: UUID) {
  return (await getCachedWorkout(sessionId)) ?? fetchRemoteSession(sessionId);
}

export async function fetchActiveWorkout(userId: UUID) {
  const local = await getCachedActiveWorkout(userId);
  if (local) return local;
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(SESSION_SELECT)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const session = mapSession(data as unknown as SessionQueryRow);
  await cacheWorkout(session);
  return session;
}

export async function fetchWorkoutHistory(userId: UUID, limit = 50) {
  const local = await getCachedWorkoutHistory(userId, limit);
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
}) {
  const existing = await fetchActiveWorkout(input.userId).catch(() => getCachedActiveWorkout(input.userId));
  if (existing) return existing;

  const now = new Date().toISOString();
  const sessionId = createId();
  const session: WorkoutSessionWithDetails = {
    id: sessionId,
    clientId: createId(),
    userId: input.userId,
    groupId: input.groupId,
    splitDayId: input.splitDayId,
    scheduledDate: input.scheduledDate ?? toISODateOnly(),
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
  values: { weightKg: number | null; reps: number; isWarmup?: boolean },
) {
  if (!Number.isInteger(values.reps) || values.reps < 1 || values.reps > 1000) throw new Error("اكتب عدد عدات صحيح.");
  if (values.weightKg !== null && (!Number.isFinite(values.weightKg) || values.weightKg < 0 || values.weightKg > 5000)) {
    throw new Error("اكتب وزن صحيح.");
  }
  const session = await fetchWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة على الجهاز.");
  let updatedSet: WorkoutSet | null = null;
  const now = new Date().toISOString();
  const exercises = session.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => {
      if (set.id !== setId) return set;
      updatedSet = {
        ...set,
        weightKg: values.weightKg,
        reps: values.reps,
        isWarmup: values.isWarmup ?? set.isWarmup,
        isCompleted: true,
        updatedAt: now,
      };
      return updatedSet;
    }),
  }));
  if (!updatedSet) throw new Error("السِت مش موجودة.");
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
      createdAt: now,
      updatedAt: now,
    })),
  };
}
