import { create } from "zustand";
import * as Network from "expo-network";
import { getLocalQueueHealth } from "@/lib/offline/database";
import {
  flushSyncQueue,
  retryDeadLetterQueue,
} from "@/lib/offline/sync";
import { subscribeSyncEvents } from "@/lib/offline/sync-events";
import {
  getNetworkSnapshot,
  networkSnapshotFromState,
  type NetworkAvailability,
} from "@/lib/offline/network";

interface ConnectivityState {
  initialized: boolean;
  networkStatus: NetworkAvailability;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  pending: number;
  failed: number;
  nextRetryAt: string | null;
  syncing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  syncNow: (force?: boolean) => Promise<void>;
  retryFailed: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

async function safeQueueHealth(fallback: {
  pending: number;
  failed: number;
  nextRetryAt: string | null;
}) {
  return getLocalQueueHealth().catch(() => fallback);
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  initialized: false,
  networkStatus: "unknown",
  isConnected: null,
  isInternetReachable: null,
  pending: 0,
  failed: 0,
  nextRetryAt: null,
  syncing: false,
  lastError: null,
  lastSyncedAt: null,

  refresh: async () => {
    const state = get();
    const [queue, network] = await Promise.all([
      safeQueueHealth({
        pending: state.pending,
        failed: state.failed,
        nextRetryAt: state.nextRetryAt,
      }),
      getNetworkSnapshot(),
    ]);

    set({
      initialized: true,
      networkStatus: network.status,
      isConnected: network.isConnected,
      isInternetReachable: network.isInternetReachable,
      ...queue,
    });
  },

  syncNow: async (force = false) => {
    if (get().syncing || get().networkStatus === "offline") return;

    set({ syncing: true, lastError: null });
    try {
      const result = await flushSyncQueue({ force });
      set({
        syncing: false,
        pending: result.pending,
        failed: result.failed,
        nextRetryAt: result.nextRetryAt,
        lastError: result.lastError,
        lastSyncedAt:
          result.processed > 0 && !result.lastError
            ? new Date().toISOString()
            : get().lastSyncedAt,
      });
    } catch (caught) {
      const state = get();
      const queue = await safeQueueHealth({
        pending: state.pending,
        failed: state.failed,
        nextRetryAt: state.nextRetryAt,
      });
      set({
        syncing: false,
        ...queue,
        lastError: caught instanceof Error ? caught.message : String(caught),
      });
    }
  },

  retryFailed: async () => {
    if (get().syncing || get().networkStatus === "offline") return;
    await retryDeadLetterQueue();
    await get().syncNow(true);
  },

  initialize: async () => {
    await get().refresh();

    let networkSubscription: { remove: () => void } | null = null;
    try {
      networkSubscription = Network.addNetworkStateListener((state) => {
        const network = networkSnapshotFromState(state);
        set({
          initialized: true,
          networkStatus: network.status,
          isConnected: network.isConnected,
          isInternetReachable: network.isInternetReachable,
        });

        if (network.status === "online") {
          void get().syncNow();
        }
      });
    } catch {
      // Keep the status unknown. The app and local workspace remain usable.
      set({
        initialized: true,
        networkStatus: "unknown",
        isConnected: null,
        isInternetReachable: null,
      });
    }

    const unsubscribeSync = subscribeSyncEvents((snapshot) =>
      set((state) => ({
        syncing: snapshot.syncing ?? state.syncing,
        pending: snapshot.pending ?? state.pending,
        failed: snapshot.failed ?? state.failed,
        nextRetryAt:
          snapshot.nextRetryAt === undefined
            ? state.nextRetryAt
            : snapshot.nextRetryAt,
        lastError:
          snapshot.lastError === undefined ? state.lastError : snapshot.lastError,
        lastSyncedAt: snapshot.lastSyncedAt ?? state.lastSyncedAt,
      })),
    );

    return () => {
      networkSubscription?.remove();
      unsubscribeSync();
    };
  },
}));
