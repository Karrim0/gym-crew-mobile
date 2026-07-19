import { supabase } from "@/lib/supabase/client";
import { cacheValue, readCachedValue } from "@/lib/offline/database";
import type { Tables } from "@/lib/supabase/database.types";
import type { Exercise, UUID } from "@/types";

type ExerciseRow = Tables<"exercises">;
const cacheKey = "exercise-library";

export function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles,
    workoutType: row.workout_type === "rest" ? "custom" : row.workout_type,
    isCustom: row.is_custom,
    createdBy: row.created_by,
  };
}

export async function fetchExercises(search = "") {
  try {
    const { data, error } = await supabase.from("exercises").select("*").order("name", { ascending: true }).limit(500);
    if (error) throw error;
    const exercises = data.map(mapExercise);
    await cacheValue(cacheKey, exercises);
    const query = search.trim().toLocaleLowerCase();
    return query ? exercises.filter((item) => item.name.toLocaleLowerCase().includes(query)) : exercises;
  } catch (caught) {
    const cached = await readCachedValue<Exercise[]>(cacheKey);
    if (!cached) throw caught;
    const query = search.trim().toLocaleLowerCase();
    return query ? cached.filter((item) => item.name.toLocaleLowerCase().includes(query)) : cached;
  }
}

export async function fetchExercise(exerciseId: UUID) {
  try {
    const { data, error } = await supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle();
    if (error) throw error;
    return data ? mapExercise(data) : null;
  } catch (caught) {
    const cached = await readCachedValue<Exercise[]>(cacheKey);
    const found = cached?.find((item) => item.id === exerciseId) ?? null;
    if (found) return found;
    throw caught;
  }
}
