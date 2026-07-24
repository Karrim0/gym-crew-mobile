import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import { fetchProfile } from "@/features/profile/profile-service";
import { fetchCurrentMembership } from "@/features/groups/group-service";
import type { CurrentGroupMembership, UserProfile } from "@/types";
import {
  clearUserLocalData,
  readCachedValue,
  removeCachedValue,
} from "@/lib/offline/database";
import { getNetworkAvailability } from "@/lib/offline/network";
import { warmOfflineWorkspace } from "@/features/offline/offline-bootstrap";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { useConnectivityStore } from "@/stores/connectivity-store";

type ContextStatus = "idle" | "loading" | "ready" | "missing" | "unavailable";
type BootstrapStatus = "idle" | "loading" | "ready" | "error";

interface SessionState {
  initialized: boolean;
  bootstrapStatus: BootstrapStatus;
  loadingContext: boolean;
  contextStatus: ContextStatus;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  membership: CurrentGroupMembership | null;
  error: string | null;
  initialize: () => Promise<() => void>;
  retryBootstrap: () => Promise<void>;
  refreshContext: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  clear: () => void;
  signOutLocal: () => Promise<void>;
}

type StoreSet = (
  value:
    | Partial<SessionState>
    | ((state: SessionState) => Partial<SessionState>),
) => void;
type StoreGet = () => SessionState;

let contextRequestId = 0;

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error("Session bootstrap timed out.")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readCachedContext(userId: string) {
  const [profile, membership] = await Promise.all([
    readCachedValue<UserProfile>(`profile:${userId}`).catch(() => null),
    readCachedValue<CurrentGroupMembership>(`membership:${userId}`).catch(
      () => null,
    ),
  ]);
  return { profile, membership };
}

async function loadFreshContext(userId: string) {
  const [profileResult, membershipResult] = await Promise.allSettled([
    fetchProfile(userId),
    fetchCurrentMembership(userId),
  ]);
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const membership =
    membershipResult.status === "fulfilled" ? membershipResult.value : null;
  const error =
    profileResult.status === "rejected"
      ? profileResult.reason
      : membershipResult.status === "rejected"
        ? membershipResult.reason
        : null;
  return { profile, membership, error };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function warmWorkspace(userId: string, membership: CurrentGroupMembership) {
  void warmOfflineWorkspace(userId, membership.group.id).catch(() => undefined);
}

async function applyFreshContext(
  requestId: number,
  userId: string,
  cached: Awaited<ReturnType<typeof readCachedContext>>,
  set: StoreSet,
  get: StoreGet,
) {
  const fresh = await loadFreshContext(userId);
  if (requestId !== contextRequestId || get().user?.id !== userId) return;

  const profile = fresh.profile ?? cached.profile ?? get().profile;
  const membership =
    fresh.membership ??
    (fresh.error ? cached.membership ?? get().membership : null);
  const status: ContextStatus = membership
    ? "ready"
    : fresh.error
      ? "unavailable"
      : "missing";

  if (!fresh.error && !fresh.membership) {
    await removeCachedValue(`membership:${userId}`).catch(() => undefined);
  }

  set({
    profile,
    membership,
    contextStatus: status,
    loadingContext: false,
    error: fresh.error ? errorMessage(fresh.error) : null,
  });

  if (membership) warmWorkspace(userId, membership);
}

/**
 * Hydrates workspace context from SQLite first. A cached membership makes the
 * navigation usable immediately; the remote refresh then runs in background.
 */
async function resolveContext(
  userId: string,
  set: StoreSet,
  get: StoreGet,
  forceRemote = false,
) {
  const requestId = ++contextRequestId;
  const hasUsableContext = Boolean(get().membership);

  if (!hasUsableContext) {
    set({ loadingContext: true, contextStatus: "loading", error: null });
  } else {
    set({ loadingContext: false, contextStatus: "ready", error: null });
  }

  const cached = await readCachedContext(userId);
  if (requestId !== contextRequestId || get().user?.id !== userId) return;

  const cachedMembership = cached.membership ?? get().membership;
  const cachedProfile = cached.profile ?? get().profile;

  if (cachedProfile || cachedMembership) {
    set({
      profile: cachedProfile,
      membership: cachedMembership,
      contextStatus: cachedMembership ? "ready" : "unavailable",
      loadingContext: false,
      error: cachedMembership
        ? null
        : "افتح التطبيق مرة واحدة بالإنترنت علشان نكمّل تجهيز بياناتك على الجهاز.",
    });
    if (cachedMembership) warmWorkspace(userId, cachedMembership);
  }

  const availability = await getNetworkAvailability();
  if (requestId !== contextRequestId || get().user?.id !== userId) return;

  if (availability === "offline") {
    if (!cachedMembership) {
      set({
        loadingContext: false,
        contextStatus: "unavailable",
        error:
          "أنت أوفلاين ولسه بيانات المساحة مش محفوظة على الجهاز. افتح التطبيق مرة واحدة بالإنترنت.",
      });
    }
    return;
  }

  if (cachedMembership && !forceRemote) {
    void applyFreshContext(requestId, userId, cached, set, get).catch(
      (caught) => {
        if (requestId !== contextRequestId || get().user?.id !== userId) return;
        set({
          loadingContext: false,
          contextStatus: "ready",
          error: errorMessage(caught),
        });
      },
    );
    return;
  }

  await applyFreshContext(requestId, userId, cached, set, get);
}

function applyAuthSession(
  event: AuthChangeEvent,
  nextSession: Session | null,
  set: StoreSet,
  get: StoreGet,
) {
  const previousUserId = get().user?.id;
  const nextUserId = nextSession?.user.id;
  const userChanged = previousUserId !== nextUserId;

  if (!nextSession?.user) {
    contextRequestId += 1;
    set({
      initialized: true,
      bootstrapStatus: "ready",
      session: null,
      user: null,
      profile: null,
      membership: null,
      loadingContext: false,
      contextStatus: "idle",
      error: null,
    });
    return;
  }

  set({
    initialized: true,
    bootstrapStatus: "ready",
    session: nextSession,
    user: nextSession.user,
    ...(userChanged
      ? {
          profile: null,
          membership: null,
          loadingContext: true,
          contextStatus: "loading" as ContextStatus,
        }
      : {}),
    error: null,
  });

  if (
    userChanged ||
    event === "INITIAL_SESSION" ||
    event === "SIGNED_IN"
  ) {
    void resolveContext(nextSession.user.id, set, get).catch((caught) => {
      if (get().user?.id !== nextSession.user.id) return;
      set({
        loadingContext: false,
        contextStatus: get().membership ? "ready" : "unavailable",
        error: errorMessage(caught),
      });
    });
  }
}

async function bootstrapSession(set: StoreSet, get: StoreGet) {
  set({ bootstrapStatus: "loading", error: null });

  try {
    const result = await withTimeout(supabase.auth.getSession(), 8000);
    if (result.error) throw result.error;

    applyAuthSession("INITIAL_SESSION", result.data.session, set, get);
  } catch (caught) {
    set({
      initialized: true,
      bootstrapStatus: "error",
      loadingContext: false,
      error: errorMessage(caught),
    });
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  bootstrapStatus: "idle",
  loadingContext: false,
  contextStatus: "idle",
  session: null,
  user: null,
  profile: null,
  membership: null,
  error: null,

  initialize: async () => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        applyAuthSession(event, nextSession, set, get);
      },
    );

    await bootstrapSession(set, get);
    return () => subscription.subscription.unsubscribe();
  },

  retryBootstrap: async () => {
    await bootstrapSession(set, get);
  },

  setProfile: (profile) => set({ profile }),

  refreshContext: async () => {
    const user = get().user;
    if (!user) return;

    try {
      await resolveContext(user.id, set, get, true);
    } catch (caught) {
      if (get().user?.id !== user.id) return;
      set({
        loadingContext: false,
        contextStatus: get().membership ? "ready" : "unavailable",
        error: errorMessage(caught),
      });
    }
  },

  clear: () => {
    contextRequestId += 1;
    set({
      session: null,
      user: null,
      profile: null,
      membership: null,
      loadingContext: false,
      contextStatus: "idle",
      bootstrapStatus: "ready",
      error: null,
    });
  },

  signOutLocal: async () => {
    const userId = get().user?.id;
    await useRestTimerStore.getState().stop();
    useNotificationCenterStore.getState().clear();
    if (userId) await clearUserLocalData(userId);
    await supabase.auth.signOut();

    contextRequestId += 1;
    set({
      session: null,
      user: null,
      profile: null,
      membership: null,
      loadingContext: false,
      contextStatus: "idle",
      bootstrapStatus: "ready",
      error: null,
    });

    await useConnectivityStore.getState().refresh();
  },
}));
