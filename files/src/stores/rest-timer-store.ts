import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cancelRestNotification, scheduleRestComplete } from "@/lib/notifications/rest-notifications";
import { useSettingsStore } from "./settings-store";

interface RestTimerState {
  active: boolean;
  paused: boolean;
  durationSeconds: number;
  remainingWhenPaused: number;
  endsAt: number | null;
  notificationId: string | null;
  nextLabel: string | null;
  route: string | null;
  start: (seconds: number, nextLabel?: string, route?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addSeconds: (seconds: number) => Promise<void>;
  stop: () => Promise<void>;
  getRemaining: () => number;
}

async function schedule(seconds: number, route: string | null, nextLabel?: string | null) {
  const settings = useSettingsStore.getState();
  if (!settings.notificationsEnabled) return null;
  return scheduleRestComplete(seconds, settings.language, {
    route: route ?? "/(tabs)/workout",
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    nextLabel,
  }).catch(() => null);
}

export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set, get) => ({
      active: false,
      paused: false,
      durationSeconds: 0,
      remainingWhenPaused: 0,
      endsAt: null,
      notificationId: null,
      nextLabel: null,
      route: null,
      getRemaining: () => {
        const state = get();
        if (!state.active) return 0;
        if (state.paused) return state.remainingWhenPaused;
        return Math.max(0, Math.ceil(((state.endsAt ?? Date.now()) - Date.now()) / 1000));
      },
      start: async (seconds, nextLabel, route) => {
        await cancelRestNotification(get().notificationId);
        const safe = Math.max(1, Math.floor(seconds));
        const notificationId = await schedule(safe, route ?? null, nextLabel ?? null);
        set({ active: true, paused: false, durationSeconds: safe, remainingWhenPaused: safe, endsAt: Date.now() + safe * 1000, notificationId, nextLabel: nextLabel ?? null, route: route ?? null });
      },
      pause: async () => {
        const remaining = get().getRemaining();
        await cancelRestNotification(get().notificationId);
        set({ paused: true, remainingWhenPaused: remaining, endsAt: null, notificationId: null });
      },
      resume: async () => {
        const state = get();
        if (!state.active || !state.paused) return;
        const safe = Math.max(1, state.remainingWhenPaused);
        const notificationId = await schedule(safe, state.route, state.nextLabel);
        set({ paused: false, endsAt: Date.now() + safe * 1000, notificationId });
      },
      addSeconds: async (delta) => {
        const state = get();
        if (!state.active) return;
        const next = Math.max(0, state.getRemaining() + delta);
        await cancelRestNotification(state.notificationId);
        if (next === 0) {
          set({ active: false, paused: false, durationSeconds: 0, remainingWhenPaused: 0, endsAt: null, notificationId: null, nextLabel: null, route: null });
          return;
        }
        if (state.paused) {
          set({ remainingWhenPaused: next, notificationId: null });
          return;
        }
        const notificationId = await schedule(next, state.route, state.nextLabel);
        set({ endsAt: Date.now() + next * 1000, remainingWhenPaused: next, notificationId });
      },
      stop: async () => {
        await cancelRestNotification(get().notificationId);
        set({ active: false, paused: false, durationSeconds: 0, remainingWhenPaused: 0, endsAt: null, notificationId: null, nextLabel: null, route: null });
      },
    }),
    {
      name: "gym-crew:rest-timer",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        active: state.active,
        paused: state.paused,
        durationSeconds: state.durationSeconds,
        remainingWhenPaused: state.remainingWhenPaused,
        endsAt: state.endsAt,
        notificationId: state.notificationId,
        nextLabel: state.nextLabel,
        route: state.route,
      }),
    },
  ),
);
