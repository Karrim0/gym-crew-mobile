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
    const [network, pending] = await Promise.all([Network.getNetworkStateAsync(), pendingSyncCount()]);
    set({
      initialized: true,
      isConnected: network.isConnected !== false,
      isInternetReachable: network.isInternetReachable !== false,
      pending,
    });
  },
  syncNow: async () => {
    if (get().syncing) return;
    set({ syncing: true, lastError: null });
    const result = await flushSyncQueue();
    set({ syncing: false, pending: result.pending, lastError: result.lastError, lastSyncedAt: !result.lastError && !result.skipped ? new Date().toISOString() : get().lastSyncedAt });
  },
  initialize: async () => {
    await get().refresh();
    const networkSubscription = Network.addNetworkStateListener((network) => {
      const online = network.isConnected !== false && network.isInternetReachable !== false;
      set({ isConnected: network.isConnected !== false, isInternetReachable: network.isInternetReachable !== false });
      if (online) void get().syncNow();
    });
    const unsubscribeSync = subscribeSyncEvents((snapshot) => set((state) => ({
      syncing: snapshot.syncing ?? state.syncing,
      pending: snapshot.pending ?? state.pending,
      lastError: snapshot.lastError === undefined ? state.lastError : snapshot.lastError,
      lastSyncedAt: snapshot.lastSyncedAt ?? state.lastSyncedAt,
    })));
    return () => {
      networkSubscription.remove();
      unsubscribeSync();
    };
  },
}));
