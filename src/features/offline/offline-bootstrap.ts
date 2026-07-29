import { fetchGroupWeeklyStats } from "@/features/groups/group-service";
import { fetchExercises } from "@/features/splits/exercise-service";
import { fetchEffectiveWeekSchedule, fetchPersonalSplit } from "@/features/splits/split-service";
import { fetchDailyConsistencyStreak, fetchWorkoutHistory } from "@/features/workouts/workout-service";

let warmingFor: string | null = null;

/**
 * Downloads the minimum workspace needed for a full gym session offline.
 * Every task is independent so one optional endpoint cannot block the rest.
 */
export async function warmOfflineWorkspace(userId: string, groupId?: string | null) {
  if (warmingFor === userId) return;
  warmingFor = userId;
  try {
    await Promise.allSettled([
      fetchPersonalSplit(userId),
      fetchEffectiveWeekSchedule(userId),
      fetchWorkoutHistory(userId, 120),
      fetchDailyConsistencyStreak(userId),
      fetchExercises(),
      groupId ? fetchGroupWeeklyStats(groupId) : Promise.resolve([]),
    ]);
  } finally {
    warmingFor = null;
  }
}
