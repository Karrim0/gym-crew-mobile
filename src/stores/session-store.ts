import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import { fetchProfile } from "@/features/profile/profile-service";
import { fetchCurrentMembership } from "@/features/groups/group-service";
import type { CurrentGroupMembership, UserProfile } from "@/types";
import { clearUserLocalData, readCachedValue, removeCachedValue } from "@/lib/offline/database";
import { isNetworkAvailable } from "@/lib/offline/network";
import { warmOfflineWorkspace } from "@/features/offline/offline-bootstrap";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { useConnectivityStore } from "@/stores/connectivity-store";

type ContextStatus = "idle" | "loading" | "ready" | "missing" | "unavailable";

interface SessionState {
  initialized: boolean;
  loadingContext: boolean;
  contextStatus: ContextStatus;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  membership: CurrentGroupMembership | null;
  error: string | null;
  initialize: () => Promise<() => void>;
  refreshContext: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  clear: () => void;
  signOutLocal: () => Promise<void>;
}

type StoreSet = (value: Partial<SessionState>) => void;
type StoreGet = () => SessionState;

async function readCachedContext(userId: string) {
  const [profile, membership] = await Promise.all([
    readCachedValue<UserProfile>(`profile:${userId}`),
    readCachedValue<CurrentGroupMembership>(`membership:${userId}`),
  ]);
  return { profile, membership };
}

async function loadFreshContext(userId: string) {
  const [profileResult, membershipResult] = await Promise.allSettled([
    fetchProfile(userId),
    fetchCurrentMembership(userId),
  ]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const membership = membershipResult.status === "fulfilled" ? membershipResult.value : null;
  const error = profileResult.status === "rejected"
    ? profileResult.reason
    : membershipResult.status === "rejected"
      ? membershipResult.reason
      : null;
  return { profile, membership, error };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyFreshContext(
  userId: string,
  cached: Awaited<ReturnType<typeof readCachedContext>>,
  set: StoreSet,
  get: StoreGet,
) {
  const fresh = await loadFreshContext(userId);
  if (get().user?.id !== userId) return;

  const profile = fresh.profile ?? cached.profile;
  const membership = fresh.membership ?? (fresh.error ? cached.membership : null);
  const status: ContextStatus = membership ? "ready" : fresh.error ? "unavailable" : "missing";

  if (!fresh.error && !fresh.membership) await removeCachedValue(`membership:${userId}`);

  set({
    profile,
    membership,
    contextStatus: status,
    loadingContext: false,
    error: fresh.error && !membership ? errorMessage(fresh.error) : null,
  });

  if (membership) void warmOfflineWorkspace(userId, membership.group.id);
}

/**
 * Hydrates auth context from SQLite first. When a cached workspace exists the
 * app becomes usable immediately and the remote refresh runs in the background.
 */
async function resolveContext(userId: string, set: StoreSet, get: StoreGet, forceRemote = false) {
  set({ loadingContext: true, contextStatus: "loading", error: null });
  const cached = await readCachedContext(userId);
  if (get().user?.id !== userId) return;

  if (cached.profile || cached.membership) {
    set({
      profile: cached.profile,
      membership: cached.membership,
      contextStatus: cached.membership ? "ready" : "unavailable",
      loadingContext: false,
      error: cached.membership ? null : "افتح التطبيق مرة واحدة بالإنترنت علشان نكمّل تجهيز بياناتك على الجهاز.",
    });
    if (cached.membership) void warmOfflineWorkspace(userId, cached.membership.group.id);
  }

  const online = await isNetworkAvailable();
  if (get().user?.id !== userId) return;
  if (!online) {
    if (!cached.membership) {
      set({
        loadingContext: false,
        contextStatus: "unavailable",
        error: "أنت أوفلاين ولسه بيانات المساحة مش محفوظة على الجهاز. افتح التطبيق مرة واحدة بالإنترنت.",
      });
    }
    return;
  }

  if (cached.membership && !forceRemote) {
    void applyFreshContext(userId, cached, set, get).catch(() => undefined);
    return;
  }

  await applyFreshContext(userId, cached, set, get);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  loadingContext: false,
  contextStatus: "idle",
  session: null,
  user: null,
  profile: null,
  membership: null,
  error: null,

  initialize: async () => {
    let session: Session | null = null;
    let authError: string | null = null;
    try {
      const result = await supabase.auth.getSession();
      session = result.data.session;
      authError = result.error?.message ?? null;
    } catch (caught) {
      authError = errorMessage(caught);
    }

    set({
      initialized: true,
      session,
      user: session?.user ?? null,
      loadingContext: Boolean(session?.user),
      contextStatus: session?.user ? "loading" : "idle",
      error: authError,
    });

    if (session?.user) void resolveContext(session.user.id, set, get);

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = get().user?.id;
      const nextUserId = nextSession?.user.id;
      set({
        initialized: true,
        session: nextSession,
        user: nextSession?.user ?? null,
        loadingContext: Boolean(nextSession?.user),
        contextStatus: nextSession?.user ? "loading" : "idle",
        error: null,
      });

      if (nextSession?.user) {
        if (previousUserId !== nextUserId) set({ profile: null, membership: null });
        void resolveContext(nextSession.user.id, set, get);
      } else {
        set({ profile: null, membership: null, loadingContext: false, contextStatus: "idle" });
      }
    });

    return () => subscription.subscription.unsubscribe();
  },

  setProfile: (profile) => set({ profile }),

  refreshContext: async () => {
    const user = get().user;
    if (!user) return;
    await resolveContext(user.id, set, get, true);
  },

  clear: () => set({
    session: null,
    user: null,
    profile: null,
    membership: null,
    loadingContext: false,
    contextStatus: "idle",
  }),

  signOutLocal: async () => {
    const userId = get().user?.id;
    await useRestTimerStore.getState().stop();
    useNotificationCenterStore.getState().clear();
    if (userId) await clearUserLocalData(userId);
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      membership: null,
      loadingContext: false,
      contextStatus: "idle",
    });
    await useConnectivityStore.getState().refresh();
  },
}));
