export interface SyncEventSnapshot {
  syncing?: boolean;
  pending?: number;
  lastError?: string | null;
  lastSyncedAt?: string | null;
}

type Listener = (snapshot: SyncEventSnapshot) => void;
const listeners = new Set<Listener>();

export function emitSyncEvent(snapshot: SyncEventSnapshot) {
  for (const listener of listeners) listener(snapshot);
}

export function subscribeSyncEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
