import * as Network from "expo-network";
import { create } from "zustand";
import { flushSyncQueue, pendingSyncCount } from "@/lib/offline/sync";
import { subscribeSyncEvents } from "@/lib/offline/sync-events";

interface ConnectivityState {
  initialized: boolean;
  isConnected: boolean;
  isInternetReachable: boolean;
  pending: number;
  syncing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  initialized: false,
  isConnected: true,
  isInternetReachable: true,
  pending: 0,
  syncing: false,
  lastError: null,
  lastSyncedAt: null,

  refresh: async () => {
    const pending = await pendingSyncCount().catch(() => 0);
    try {
      const network = await Network.getNetworkStateAsync();
      set({
        initialized: true,
        isConnected: network.isConnected !== false,
        isInternetReachable: network.isInternetReachable !== false,
        pending,
      });
    } catch {
      set({ initialized: true, isConnected: false, isInternetReachable: false, pending });
    }
  },

  syncNow: async () => {
    if (get().syncing) return;
    set({ syncing: true, lastError: null });
    try {
      const result = await flushSyncQueue();
      set({
        syncing: false,
        pending: result.pending,
        lastError: result.lastError,
        lastSyncedAt: !result.lastError && !result.skipped ? new Date().toISOString() : get().lastSyncedAt,
      });
    } catch (caught) {
      set({
        syncing: false,
        pending: await pendingSyncCount().catch(() => get().pending),
        lastError: caught instanceof Error ? caught.message : String(caught),
      });
    }
  },

  initialize: async () => {
    await get().refresh();
    let networkSubscription: { remove: () => void } | null = null;
    try {
      networkSubscription = Network.addNetworkStateListener((network) => {
        const online = network.isConnected !== false && network.isInternetReachable !== false;
        set({ isConnected: network.isConnected !== false, isInternetReachable: network.isInternetReachable !== false });
        if (online) void get().syncNow();
      });
    } catch {
      // The rest of the app must remain usable even if the native listener fails.
    }
    const unsubscribeSync = subscribeSyncEvents((snapshot) => set((state) => ({
      syncing: snapshot.syncing ?? state.syncing,
      pending: snapshot.pending ?? state.pending,
      lastError: snapshot.lastError === undefined ? state.lastError : snapshot.lastError,
      lastSyncedAt: snapshot.lastSyncedAt ?? state.lastSyncedAt,
    })));
    return () => {
      networkSubscription?.remove();
      unsubscribeSync();
    };
  },
}));
