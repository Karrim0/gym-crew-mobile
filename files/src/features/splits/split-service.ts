import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { cacheValue, readCachedValue, removeCachedValue, removeCachedValuesLike } from "@/lib/offline/database";
import { isNetworkAvailable } from "@/lib/offline/network";
import { addDays, getTrainingWeekRange, normalizeISODateOnly, todayISODateOnly, toISODateOnly, weekdayOrder } from "@/lib/utils/date";
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

export type SplitTemplateKey = "manual" | "full_body_3" | "upper_lower_4" | "ppl_ul_5" | "ppl_6" | "girls_strength_4";

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

function sortSplit(days: SplitDayWithDetails[]) {
  return [...days].sort((a, b) => weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday));
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

function buildWeekFromSplit(userId: UUID, split: SplitDayWithDetails[], anchorDate = todayISODateOnly()) {
  const normalizedAnchor = normalizeISODateOnly(anchorDate);
  const { start, startISO } = getTrainingWeekRange(normalizedAnchor);
  const byWeekday = new Map(split.map((day) => [day.weekday, day]));
  const schedule = weekdayOrder.map((weekday, index): WeeklyScheduleDayWithDetails => {
    const sourceDay = byWeekday.get(weekday) ?? null;
    const scheduleDate = toISODateOnly(addDays(start, index));
    return {
      id: `local-week-${userId}-${scheduleDate}`,
      userId,
      groupId: sourceDay?.groupId ?? "",
      scheduleDate,
      sourceSplitDayId: sourceDay?.id ?? null,
      workoutType: sourceDay?.workoutType ?? "rest",
      displayName: sourceDay?.displayName ?? "Rest",
      focusLabel: sourceDay?.focusLabel ?? "",
      iconKey: sourceDay?.iconKey ?? "moon",
      colorKey: sourceDay?.colorKey ?? "blue",
      dayNotes: sourceDay?.dayNotes ?? "",
      isCustomized: false,
      sourceDay,
      exercises: sourceDay?.exercises ?? [],
    };
  });
  return { schedule, cacheKey: `week-schedule:${userId}:${startISO}` };
}

export async function cacheWeekFromPersonalSplit(userId: UUID, split: SplitDayWithDetails[], anchorDate = todayISODateOnly()) {
  const { schedule, cacheKey } = buildWeekFromSplit(userId, sortSplit(split), anchorDate);
  await cacheValue(cacheKey, schedule);
  return schedule;
}

export async function invalidateSplitCaches(userId: UUID) {
  await Promise.all([
    removeCachedValue(`personal-split:${userId}`),
    removeCachedValuesLike(`week-schedule:${userId}:%`),
  ]);
}

export async function fetchPersonalSplit(userId: UUID): Promise<SplitDayWithDetails[]> {
  const cacheKey = `personal-split:${userId}`;
  const online = await isNetworkAvailable();
  if (!online) {
    const cached = await readCachedValue<SplitDayWithDetails[]>(cacheKey);
    if (cached?.length) return sortSplit(cached);
    throw new Error("افتح الجدول مرة واحدة بالإنترنت علشان يبقى متاح أوفلاين.");
  }

  try {
    const { error: ensureError } = await supabase.rpc("ensure_personal_split");
    if (ensureError) throw ensureError;
    const { data, error } = await supabase
      .from("split_days")
      .select("*, split_exercises(*, exercises(*))")
      .eq("owner_user_id", userId);
    if (error) throw error;
    const split = sortSplit((data as unknown as SplitDayQueryRow[]).map(mapSplitDay));
    await cacheValue(cacheKey, split);
    return split;
  } catch (caught) {
    const cached = await readCachedValue<SplitDayWithDetails[]>(cacheKey);
    if (cached?.length) return sortSplit(cached);
    throw caught;
  }
}

export async function fetchEffectiveWeekSchedule(userId: UUID, anchorDate = todayISODateOnly()) {
  const normalizedAnchor = normalizeISODateOnly(anchorDate);
  const { startISO, endISO } = getTrainingWeekRange(normalizedAnchor);
  const cacheKey = `week-schedule:${userId}:${startISO}`;
  const online = await isNetworkAvailable();

  if (!online) {
    const cached = await readCachedValue<WeeklyScheduleDayWithDetails[]>(cacheKey);
    if (cached?.length) return cached;
    const personal = await readCachedValue<SplitDayWithDetails[]>(`personal-split:${userId}`);
    if (personal?.length) return cacheWeekFromPersonalSplit(userId, personal, normalizedAnchor);
    throw new Error("افتح جدولك مرة واحدة بالإنترنت قبل استخدامه أوفلاين.");
  }

  try {
    const { error: ensureError } = await supabase.rpc("ensure_week_schedule", { target_anchor_date: normalizedAnchor });
    if (ensureError) throw ensureError;
    const { data, error } = await supabase
      .from("weekly_schedule_days")
      .select("*, split_days:source_split_day_id(*, split_exercises(*, exercises(*)))")
      .eq("user_id", userId)
      .gte("schedule_date", startISO)
      .lte("schedule_date", endISO)
      .order("schedule_date", { ascending: true });
    if (error) throw error;
    const schedule = (data as unknown as WeeklyScheduleQueryRow[]).map(mapWeekly);
    if (schedule.length) await cacheValue(cacheKey, schedule);
    return schedule;
  } catch (caught) {
    const cached = await readCachedValue<WeeklyScheduleDayWithDetails[]>(cacheKey);
    if (cached?.length) return cached;
    const personal = await readCachedValue<SplitDayWithDetails[]>(`personal-split:${userId}`);
    if (personal?.length) return cacheWeekFromPersonalSplit(userId, personal, normalizedAnchor);
    throw caught;
  }
}

async function applyGirlsTemplateRpc() {
  const v3 = await supabase.rpc("apply_girls_strength_4_template_v3");
  if (!v3.error) return;
  const missingV3 = /function .*apply_girls_strength_4_template_v3|schema cache/i.test(v3.error.message);
  if (!missingV3) throw v3.error;

  const v2 = await supabase.rpc("apply_girls_strength_4_template_v2");
  if (!v2.error) return;
  const missingV2 = /function .*apply_girls_strength_4_template_v2|schema cache/i.test(v2.error.message);
  if (!missingV2) throw v2.error;

  const legacy = await supabase.rpc("apply_girls_strength_4_template");
  if (legacy.error) throw legacy.error;
}

export async function applySplitTemplate(userId: UUID, template: SplitTemplateKey) {
  if (!(await isNetworkAvailable())) throw new Error("تعديل الجدول محتاج إنترنت. تمريناتك المسجلة أوفلاين هتفضل محفوظة.");

  if (template === "girls_strength_4") {
    await applyGirlsTemplateRpc();
  } else {
    const result = await supabase.rpc("apply_split_template", { target_template_key: template });
    if (result.error) throw new Error(result.error.message);
  }

  await invalidateSplitCaches(userId);
  const updated = await fetchPersonalSplit(userId);
  await cacheWeekFromPersonalSplit(userId, updated);

  if (template === "girls_strength_4") {
    const girlsDays = updated.filter((day) => /^Girls Day [1-4]$/.test(day.displayName ?? "") && day.workoutType !== "rest");
    const appliedExercises = girlsDays.reduce((sum, day) => sum + day.exercises.length, 0);
    if (girlsDays.length !== 4 || appliedExercises !== 25) {
      throw new Error("القالب ما اتطبقش كامل. شغّل ملف SQL المرفق للنسخة الجديدة وجرب تاني.");
    }
  }

  void fetchEffectiveWeekSchedule(userId).catch(() => undefined);
  return updated;
}

export async function reorderPersonalSplitDays(userId: UUID, orderedDayIds: UUID[]) {
  if (orderedDayIds.length !== 7 || new Set(orderedDayIds).size !== 7) throw new Error("لازم ترتّب أيام الأسبوع السبعة.");
  if (!(await isNetworkAvailable())) throw new Error("ترتيب الجدول محتاج إنترنت.");
  const { error } = await supabase.rpc("reorder_personal_split_days", { target_ordered_day_ids: orderedDayIds });
  if (error) throw new Error(error.message);
  await invalidateSplitCaches(userId);
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
      target_sets: input.targetSets ?? 2,
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
  const updates = orderedIds.map((id, position) => supabase.from("split_exercises").update({ position }).eq("id", id).eq("split_day_id", splitDayId));
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
