import { create } from "zustand";
import * as Network from "expo-network";
import { flushSyncQueue, pendingSyncCount } from "@/lib/offline/sync";
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
  syncing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

async function safePendingCount(fallback = 0) {
  return pendingSyncCount().catch(() => fallback);
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  initialized: false,
  networkStatus: "unknown",
  isConnected: null,
  isInternetReachable: null,
  pending: 0,
  syncing: false,
  lastError: null,
  lastSyncedAt: null,

  refresh: async () => {
    const [pending, network] = await Promise.all([
      safePendingCount(get().pending),
      getNetworkSnapshot(),
    ]);

    set({
      initialized: true,
      networkStatus: network.status,
      isConnected: network.isConnected,
      isInternetReachable: network.isInternetReachable,
      pending,
    });
  },

  syncNow: async () => {
    if (get().syncing || get().networkStatus === "offline") return;

    set({ syncing: true, lastError: null });
    try {
      const result = await flushSyncQueue();
      set({
        syncing: false,
        pending: result.pending,
        lastError: result.lastError,
        lastSyncedAt:
          !result.lastError && !result.skipped
            ? new Date().toISOString()
            : get().lastSyncedAt,
      });
    } catch (caught) {
      set({
        syncing: false,
        pending: await safePendingCount(get().pending),
        lastError: caught instanceof Error ? caught.message : String(caught),
      });
    }
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
