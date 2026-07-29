import type { WorkoutSessionWithDetails } from "@/types";

const MAX_REASONABLE_SECONDS = 8 * 60 * 60;

export function workoutDurationSeconds(session: Pick<WorkoutSessionWithDetails, "durationSeconds" | "startedAt" | "completedAt">) {
  const stored = Number.isFinite(session.durationSeconds) ? Math.max(0, Math.floor(session.durationSeconds)) : 0;
  if (stored > 0 && stored <= MAX_REASONABLE_SECONDS) return stored;
  if (!session.completedAt) return stored > MAX_REASONABLE_SECONDS ? 0 : stored;
  const started = new Date(session.startedAt).getTime();
  const completed = new Date(session.completedAt).getTime();
  const derived = Math.floor((completed - started) / 1000);
  if (!Number.isFinite(derived) || derived <= 0) return 0;
  return derived <= MAX_REASONABLE_SECONDS ? derived : 0;
}

export function workoutDurationMinutes(session: Pick<WorkoutSessionWithDetails, "durationSeconds" | "startedAt" | "completedAt">) {
  const seconds = workoutDurationSeconds(session);
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}
