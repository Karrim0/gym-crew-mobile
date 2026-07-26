import type { ImageSource } from "expo-image";
import type { MuscleGroup, WorkoutType } from "@/types";

export const brandImages = {
  barbell: require("../../../assets/images/brand/hero-barbell.webp") as ImageSource,
  strength: require("../../../assets/images/brand/hero-strength.webp") as ImageSource,
  squat: require("../../../assets/images/brand/hero-squat.webp") as ImageSource,
} as const;

export function workoutVisual(workoutType?: WorkoutType | null): ImageSource {
  if (workoutType === "legs") return brandImages.squat;
  if (workoutType === "pull") return brandImages.strength;
  return brandImages.barbell;
}

export function muscleVisual(muscle?: MuscleGroup | null): ImageSource {
  if (muscle === "quads" || muscle === "hamstrings" || muscle === "glutes" || muscle === "calves") return brandImages.squat;
  if (muscle === "back" || muscle === "biceps") return brandImages.strength;
  return brandImages.barbell;
}
