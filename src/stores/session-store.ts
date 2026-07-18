import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import { fetchProfile } from "@/features/profile/profile-service";
import { fetchCurrentMembership } from "@/features/groups/group-service";
import type { CurrentGroupMembership, UserProfile } from "@/types";
import { clearUserLocalData } from "@/lib/offline/database";

interface SessionState {
  initialized: boolean;
  loadingContext: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  membership: CurrentGroupMembership | null;
  error: string | null;
  initialize: () => Promise<() => void>;
  refreshContext: () => Promise<void>;
  clear: () => void;
  signOutLocal: () => Promise<void>;
}

async function loadContext(userId: string) {
  const [profile, membership] = await Promise.all([
    fetchProfile(userId),
    fetchCurrentMembership(userId),
  ]);
  return { profile, membership };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  loadingContext: false,
  session: null,
  user: null,
  profile: null,
  membership: null,
  error: null,

  initialize: async () => {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    set({
      session,
      user: session?.user ?? null,
      loadingContext: Boolean(session?.user),
      error: error?.message ?? null,
    });
    if (session?.user) {
      try {
        const context = await loadContext(session.user.id);
        set(context);
      } catch (caught) {
        set({ error: caught instanceof Error ? caught.message : String(caught) });
      }
    }
    set({ initialized: true, loadingContext: false });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        loadingContext: Boolean(nextSession?.user),
        error: null,
      });
      if (nextSession?.user) {
        try {
          const context = await loadContext(nextSession.user.id);
          set(context);
        } catch (caught) {
          set({ error: caught instanceof Error ? caught.message : String(caught) });
        } finally {
          set({ loadingContext: false });
        }
      } else {
        set({ profile: null, membership: null, loadingContext: false });
      }
    });

    return () => subscription.subscription.unsubscribe();
  },

  refreshContext: async () => {
    const user = get().user;
    if (!user) return;
    set({ loadingContext: true, error: null });
    try {
      const context = await loadContext(user.id);
      set(context);
    } catch (caught) {
      set({ error: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      set({ loadingContext: false });
    }
  },

  clear: () => set({ session: null, user: null, profile: null, membership: null, loadingContext: false }),

  signOutLocal: async () => {
    const userId = get().user?.id;
    if (userId) await clearUserLocalData(userId);
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, membership: null, loadingContext: false });
  },
}));
