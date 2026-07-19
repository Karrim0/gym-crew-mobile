import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface NotificationInboxItem {
  id: string;
  title: string;
  body: string;
  route: string | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationCenterState {
  items: NotificationInboxItem[];
  add: (item: Omit<NotificationInboxItem, "readAt"> & { readAt?: string | null }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationCenterStore = create<NotificationCenterState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((state) => {
        const existing = state.items.find((current) => current.id === item.id);
        const next: NotificationInboxItem = {
          ...item,
          readAt: item.readAt === undefined ? existing?.readAt ?? null : item.readAt,
        };
        return {
          items: [next, ...state.items.filter((current) => current.id !== item.id)]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 50),
        };
      }),
      markRead: (id) => set((state) => ({
        items: state.items.map((item) => item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item),
      })),
      markAllRead: () => set((state) => ({
        items: state.items.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }),
      })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "gym-crew:notification-center",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
