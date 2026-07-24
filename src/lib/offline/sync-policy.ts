export type SyncEntity = "workoutSession" | "workoutExercise" | "workoutSet";
export type SyncOperation = "upsert" | "delete";
export type SyncQueueStatus = "pending" | "processing" | "failed" | "dead_letter";

export interface SyncMutation<TPayload = unknown> {
  entity: SyncEntity;
  operation: SyncOperation;
  payload: TPayload;
  scopeId?: string | null;
  ownerUserId?: string | null;
}

export const MAX_SYNC_ATTEMPTS = 6;
export const PROCESSING_LEASE_MS = 5 * 60 * 1000;

const RETRY_DELAYS_MS = [
  5_000,
  15_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
] as const;

export function syncEntityId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as { id?: unknown }).id;
  return typeof value === "string" && value.length ? value : null;
}

export function syncScopeId(
  entity: SyncEntity,
  payload: unknown,
  explicitScopeId?: string | null,
) {
  if (explicitScopeId) return explicitScopeId;
  if (!payload || typeof payload !== "object") return null;

  if (entity === "workoutSession") {
    return syncEntityId(payload);
  }

  if (entity === "workoutExercise") {
    const value = (payload as { workoutSessionId?: unknown }).workoutSessionId;
    return typeof value === "string" && value.length ? value : null;
  }

  return null;
}

export function syncOwnerUserId(payload: unknown, explicitOwnerUserId?: string | null) {
  if (explicitOwnerUserId) return explicitOwnerUserId;
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as { userId?: unknown }).userId;
  return typeof value === "string" && value.length ? value : null;
}

export function syncIdempotencyKey(entity: SyncEntity, entityId: string) {
  return `${entity}:${entityId}`;
}

export function retryDelayMs(attemptsAfterFailure: number) {
  const safeAttempt = Math.max(1, Math.floor(attemptsAfterFailure));
  return RETRY_DELAYS_MS[Math.min(safeAttempt - 1, RETRY_DELAYS_MS.length - 1)];
}

export function nextRetryAt(attemptsAfterFailure: number, now = new Date()) {
  return new Date(now.getTime() + retryDelayMs(attemptsAfterFailure)).toISOString();
}

export function shouldDeadLetter(attemptsAfterFailure: number) {
  return attemptsAfterFailure >= MAX_SYNC_ATTEMPTS;
}

export function compareIsoTimestamps(left: string | null | undefined, right: string | null | undefined) {
  const leftValue = left ? Date.parse(left) : Number.NaN;
  const rightValue = right ? Date.parse(right) : Number.NaN;

  if (!Number.isFinite(leftValue) && !Number.isFinite(rightValue)) return 0;
  if (!Number.isFinite(leftValue)) return -1;
  if (!Number.isFinite(rightValue)) return 1;
  return Math.sign(leftValue - rightValue);
}

export function isLikelyTransportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /network request failed|fetch failed|timed? out|timeout|socket|connection (?:closed|reset|refused)|offline|internet|econn|enotfound|502|503|504/i.test(
    message,
  );
}
