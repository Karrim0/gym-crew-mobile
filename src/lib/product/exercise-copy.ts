import type { MuscleGroup } from "@/types";

const arabicMuscles: Record<MuscleGroup, string> = {
  chest: "صدر",
  back: "ظهر",
  shoulders: "كتف",
  biceps: "باي",
  triceps: "تراي",
  quads: "أمامية",
  hamstrings: "خلفية",
  glutes: "جلوتس",
  calves: "سمانة",
  core: "بطن",
};

export function muscleLabel(muscle: MuscleGroup, language: "ar" | "en") {
  return language === "ar" ? arabicMuscles[muscle] : muscle;
}

export function isLikelyBodyweightExercise(name: string) {
  const value = name.toLowerCase().replace(/[–—_]/g, " ").trim();
  return [
    "bodyweight",
    "push up",
    "push-up",
    "pull up",
    "pull-up",
    "chin up",
    "chin-up",
    "dips",
    "dip",
    "plank",
    "burpee",
    "mountain climber",
    "sit up",
    "sit-up",
    "ضغط أرضي",
    "عقلة",
    "متوازي",
    "بلانك",
  ].some((term) => value.includes(term));
}
