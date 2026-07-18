import type {
  Exercise,
  ISODateOnlyString,
  ISODateString,
  SplitDay,
  SplitDayColorKey,
  SplitDayIconKey,
  SplitExercise,
  UUID,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutType,
} from "./domain";

export interface SplitExerciseWithDetails extends SplitExercise {
  exercise: Exercise;
}

export interface SplitDayWithDetails extends Omit<SplitDay, "exercises"> {
  exercises: SplitExerciseWithDetails[];
}

export interface WeeklyScheduleDayWithDetails {
  id: UUID;
  userId: UUID;
  groupId: UUID;
  scheduleDate: ISODateOnlyString;
  sourceSplitDayId: UUID | null;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
  isCustomized: boolean;
  sourceDay: SplitDayWithDetails | null;
  exercises: SplitExerciseWithDetails[];
}

export interface WorkoutExerciseWithDetails extends Omit<WorkoutExercise, "sets"> {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutSessionWithDetails extends Omit<WorkoutSession, "exercises"> {
  exercises: WorkoutExerciseWithDetails[];
}

export interface PreviousExercisePerformance {
  sessionId: UUID;
  scheduledDate: ISODateOnlyString;
  completedAt: ISODateString | null;
  exerciseNotes: string;
  sets: WorkoutSet[];
}

export type PreviousPerformanceMap = Record<UUID, PreviousExercisePerformance>;

export interface CurrentGroupMembership {
  member: import("./domain").GroupMember;
  group: import("./domain").WorkoutGroup;
}

export interface GroupMemberWeeklyStats {
  userId: UUID;
  displayName: string;
  avatarUrl: string | null;
  role: import("./domain").GroupRole;
  sessionsThisWeek: number;
  scheduledThisWeek: number;
  adherencePercent: number;
  personalRecordsCount: number;
  lastWorkoutAt: string | null;
}

export * from "./domain";
