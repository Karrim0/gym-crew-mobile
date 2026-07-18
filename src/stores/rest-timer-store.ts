import { create } from "zustand";
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
  start: (seconds: number, nextLabel?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addSeconds: (seconds: number) => Promise<void>;
  stop: () => Promise<void>;
  getRemaining: () => number;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  active: false,
  paused: false,
  durationSeconds: 0,
  remainingWhenPaused: 0,
  endsAt: null,
  notificationId: null,
  nextLabel: null,

  getRemaining: () => {
    const state = get();
    if (!state.active) return 0;
    if (state.paused) return state.remainingWhenPaused;
    return Math.max(0, Math.ceil(((state.endsAt ?? Date.now()) - Date.now()) / 1000));
  },

  start: async (seconds, nextLabel) => {
    await cancelRestNotification(get().notificationId);
    const safe = Math.max(1, Math.floor(seconds));
    const language = useSettingsStore.getState().language;
    const soundEnabled = useSettingsStore.getState().soundEnabled;
    const notificationId = soundEnabled ? await scheduleRestComplete(safe, language).catch(() => null) : null;
    set({
      active: true,
      paused: false,
      durationSeconds: safe,
      remainingWhenPaused: safe,
      endsAt: Date.now() + safe * 1000,
      notificationId,
      nextLabel: nextLabel ?? null,
    });
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
    const settings = useSettingsStore.getState();
    const notificationId = settings.soundEnabled
      ? await scheduleRestComplete(safe, settings.language).catch(() => null)
      : null;
    set({ paused: false, endsAt: Date.now() + safe * 1000, notificationId });
  },

  addSeconds: async (delta) => {
    const state = get();
    if (!state.active) return;
    const next = Math.max(0, state.getRemaining() + delta);
    await cancelRestNotification(state.notificationId);
    if (next === 0) {
      set({ active: false, paused: false, remainingWhenPaused: 0, endsAt: null, notificationId: null });
      return;
    }
    if (state.paused) {
      set({ remainingWhenPaused: next, notificationId: null });
      return;
    }
    const settings = useSettingsStore.getState();
    const notificationId = settings.soundEnabled
      ? await scheduleRestComplete(next, settings.language).catch(() => null)
      : null;
    set({ endsAt: Date.now() + next * 1000, remainingWhenPaused: next, notificationId });
  },

  stop: async () => {
    await cancelRestNotification(get().notificationId);
    set({
      active: false,
      paused: false,
      durationSeconds: 0,
      remainingWhenPaused: 0,
      endsAt: null,
      notificationId: null,
      nextLabel: null,
    });
  },
}));
