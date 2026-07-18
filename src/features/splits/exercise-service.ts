import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import type { Exercise, UUID } from "@/types";

type ExerciseRow = Tables<"exercises">;

export function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles,
    workoutType: (row.workout_type === "rest" ? "custom" : row.workout_type),
    isCustom: row.is_custom,
    createdBy: row.created_by,
  };
}

export async function fetchExercises(search = "") {
  let query = supabase.from("exercises").select("*").order("name", { ascending: true }).limit(200);
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapExercise);
}

export async function fetchExercise(exerciseId: UUID) {
  const { data, error } = await supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapExercise(data) : null;
}
