import type { Language } from "@/stores/settings-store";
import type { MuscleGroup, Weekday, WorkoutType } from "@/types";

const weekdays = {
  ar: {
    saturday: "السبت",
    sunday: "الأحد",
    monday: "الاتنين",
    tuesday: "التلات",
    wednesday: "الأربع",
    thursday: "الخميس",
    friday: "الجمعة",
  },
  en: {
    saturday: "Sat",
    sunday: "Sun",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
  },
} satisfies Record<Language, Record<Weekday, string>>;

const workoutTypes = {
  ar: { push: "بوش", pull: "بول", legs: "ليجز", rest: "راحة", custom: "مخصص" },
  en: { push: "Push", pull: "Pull", legs: "Legs", rest: "Rest", custom: "Custom" },
} satisfies Record<Language, Record<WorkoutType, string>>;

const muscles = {
  ar: {
    chest: "صدر",
    back: "ضهر",
    shoulders: "كتف",
    biceps: "باي",
    triceps: "تراي",
    quads: "أمامية",
    hamstrings: "خلفية",
    glutes: "جلوتس",
    calves: "سمانة",
    core: "كور",
  },
  en: {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    quads: "Quads",
    hamstrings: "Hamstrings",
    glutes: "Glutes",
    calves: "Calves",
    core: "Core",
  },
} satisfies Record<Language, Record<MuscleGroup, string>>;

export function weekdayLabel(day: Weekday, language: Language) {
  return weekdays[language][day];
}

export function workoutTypeLabel(type: WorkoutType, language: Language) {
  return workoutTypes[language][type];
}

export function muscleLabel(muscle: MuscleGroup, language: Language) {
  return muscles[language][muscle];
}
