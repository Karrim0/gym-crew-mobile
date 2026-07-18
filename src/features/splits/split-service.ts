import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { cacheValue, readCachedValue } from "@/lib/offline/database";
import { addDays, startOfTrainingWeek, toISODateOnly } from "@/lib/utils/date";
import type {
  Exercise,
  SplitDayColorKey,
  SplitDayIconKey,
  SplitDayWithDetails,
  SplitExercise,
  SplitExerciseWithDetails,
  UUID,
  WeeklyScheduleDayWithDetails,
  WorkoutType,
} from "@/types";
import { mapExercise } from "./exercise-service";

type SplitDayRow = Tables<"split_days">;
type SplitExerciseRow = Tables<"split_exercises">;
type ExerciseRow = Tables<"exercises">;
type WeeklyScheduleRow = Tables<"weekly_schedule_days">;
type SplitExerciseQueryRow = SplitExerciseRow & { exercises: ExerciseRow };
type SplitDayQueryRow = SplitDayRow & { split_exercises: SplitExerciseQueryRow[] };
type WeeklyScheduleQueryRow = WeeklyScheduleRow & { split_days: SplitDayQueryRow | null };

function mapSplitExercise(row: SplitExerciseQueryRow): SplitExerciseWithDetails {
  return {
    id: row.id,
    splitDayId: row.split_day_id,
    exerciseId: row.exercise_id,
    order: row.position,
    targetSets: row.target_sets,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    isPersonalAddition: row.is_personal_addition,
    exercise: mapExercise(row.exercises),
  };
}

function mapSplitDay(row: SplitDayQueryRow): SplitDayWithDetails {
  return {
    id: row.id,
    groupId: row.group_id,
    ownerUserId: row.owner_user_id,
    weekday: row.weekday,
    workoutType: row.workout_type,
    displayName: row.display_name,
    focusLabel: row.focus_label,
    iconKey: row.icon_key as SplitDayIconKey,
    colorKey: row.color_key as SplitDayColorKey,
    dayNotes: row.day_notes,
    exercises: [...row.split_exercises].sort((a, b) => a.position - b.position).map(mapSplitExercise),
  };
}

function mapWeekly(row: WeeklyScheduleQueryRow): WeeklyScheduleDayWithDetails {
  const sourceDay = row.split_days ? mapSplitDay(row.split_days) : null;
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    scheduleDate: row.schedule_date,
    sourceSplitDayId: row.source_split_day_id,
    workoutType: row.workout_type,
    displayName: row.display_name,
    focusLabel: row.focus_label,
    iconKey: row.icon_key as SplitDayIconKey,
    colorKey: row.color_key as SplitDayColorKey,
    dayNotes: row.day_notes,
    isCustomized: row.is_customized,
    sourceDay,
    exercises: sourceDay?.exercises ?? [],
  };
}

export async function fetchPersonalSplit(userId: UUID): Promise<SplitDayWithDetails[]> {
  const cacheKey = `personal-split:${userId}`;
  try {
    const { error: ensureError } = await supabase.rpc("ensure_personal_split");
    if (ensureError) throw ensureError;
    const { data, error } = await supabase
      .from("split_days")
      .select("*, split_exercises(*, exercises(*))")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const split = (data as unknown as SplitDayQueryRow[]).map(mapSplitDay);
    await cacheValue(cacheKey, split);
    return split;
  } catch (caught) {
    const cached = await readCachedValue<SplitDayWithDetails[]>(cacheKey);
    if (cached?.length) return cached;
    throw caught;
  }
}

export async function fetchEffectiveWeekSchedule(userId: UUID, anchorDate = toISODateOnly()) {
  const cacheKey = `week-schedule:${userId}:${anchorDate}`;
  try {
    const { error: ensureError } = await supabase.rpc("ensure_week_schedule", { target_anchor_date: anchorDate });
    if (ensureError) throw ensureError;
    const start = startOfTrainingWeek(new Date(`${anchorDate}T12:00:00`));
    const end = addDays(start, 6);
    const { data, error } = await supabase
      .from("weekly_schedule_days")
      .select("*, split_days:source_split_day_id(*, split_exercises(*, exercises(*)))")
      .eq("user_id", userId)
      .gte("schedule_date", toISODateOnly(start))
      .lte("schedule_date", toISODateOnly(end))
      .order("schedule_date", { ascending: true });
    if (error) throw error;
    const schedule = (data as unknown as WeeklyScheduleQueryRow[]).map(mapWeekly);
    await cacheValue(cacheKey, schedule);
    return schedule;
  } catch (caught) {
    const cached = await readCachedValue<WeeklyScheduleDayWithDetails[]>(cacheKey);
    if (cached?.length) return cached;
    throw caught;
  }
}

export async function applySplitTemplate(template: "manual" | "full_body_3" | "upper_lower_4" | "ppl_ul_5" | "ppl_6") {
  const { error } = await supabase.rpc("apply_split_template", { target_template_key: template });
  if (error) throw new Error(error.message);
}

export async function updateSplitDay(input: {
  splitDayId: UUID;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
}) {
  const { error } = await supabase.rpc("update_split_day_settings", {
    target_split_day_id: input.splitDayId,
    target_workout_type: input.workoutType,
    target_display_name: input.displayName.trim(),
    target_focus_label: input.focusLabel.trim(),
    target_icon_key: input.iconKey,
    target_color_key: input.colorKey,
    target_day_notes: input.dayNotes.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function updateWeeklyScheduleDay(input: {
  scheduleDate: string;
  sourceSplitDayId: UUID;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
}) {
  const { error } = await supabase.rpc("update_week_schedule_day", {
    target_schedule_date: input.scheduleDate,
    target_source_split_day_id: input.sourceSplitDayId,
    target_workout_type: input.workoutType,
    target_display_name: input.displayName.trim(),
    target_focus_label: input.focusLabel.trim(),
    target_icon_key: input.iconKey,
    target_color_key: input.colorKey,
    target_day_notes: input.dayNotes.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function addSplitExercise(input: {
  splitDayId: UUID;
  exercise: Exercise;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
}) {
  const { data: rows, error: positionError } = await supabase
    .from("split_exercises")
    .select("position")
    .eq("split_day_id", input.splitDayId)
    .order("position", { ascending: false })
    .limit(1);
  if (positionError) throw new Error(positionError.message);
  const position = (rows[0]?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("split_exercises")
    .insert({
      split_day_id: input.splitDayId,
      exercise_id: input.exercise.id,
      position,
      target_sets: input.targetSets ?? 3,
      target_reps_min: input.targetRepsMin ?? 8,
      target_reps_max: input.targetRepsMax ?? 12,
      is_personal_addition: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    splitDayId: data.split_day_id,
    exerciseId: data.exercise_id,
    order: data.position,
    targetSets: data.target_sets,
    targetRepsMin: data.target_reps_min,
    targetRepsMax: data.target_reps_max,
    isPersonalAddition: data.is_personal_addition,
  } satisfies SplitExercise;
}

export async function updateSplitExerciseTargets(id: UUID, targetSets: number, min: number, max: number) {
  const { error } = await supabase
    .from("split_exercises")
    .update({ target_sets: targetSets, target_reps_min: min, target_reps_max: max })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeSplitExercise(id: UUID) {
  const { error } = await supabase.from("split_exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSplitExercises(splitDayId: UUID, orderedIds: UUID[]) {
  const updates = orderedIds.map((id, position) =>
    supabase.from("split_exercises").update({ position }).eq("id", id).eq("split_day_id", splitDayId),
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
