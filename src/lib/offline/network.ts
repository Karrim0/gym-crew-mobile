import * as Network from "expo-network";

export type NetworkAvailability = "online" | "offline" | "unknown";

export interface NetworkSnapshot {
  status: NetworkAvailability;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

type ExpoNetworkState = Awaited<ReturnType<typeof Network.getNetworkStateAsync>>;

const UNKNOWN_NETWORK: NetworkSnapshot = {
  status: "unknown",
  isConnected: null,
  isInternetReachable: null,
};

export function networkSnapshotFromState(state: ExpoNetworkState): NetworkSnapshot {
  const isConnected = typeof state.isConnected === "boolean" ? state.isConnected : null;
  const isInternetReachable =
    typeof state.isInternetReachable === "boolean" ? state.isInternetReachable : null;

  if (isConnected === false || isInternetReachable === false) {
    return { status: "offline", isConnected, isInternetReachable };
  }

  if (isConnected === true && isInternetReachable === true) {
    return { status: "online", isConnected, isInternetReachable };
  }

  return { status: "unknown", isConnected, isInternetReachable };
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Network status timed out.")), timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getNetworkSnapshot(timeoutMs = 2500): Promise<NetworkSnapshot> {
  try {
    const state = await withTimeout(Network.getNetworkStateAsync(), timeoutMs);
    return networkSnapshotFromState(state);
  } catch {
    // A missing/slow native network API is not proof that the device is offline.
    return UNKNOWN_NETWORK;
  }
}

export async function getNetworkAvailability(): Promise<NetworkAvailability> {
  return (await getNetworkSnapshot()).status;
}

/**
 * Returns false only when the native API explicitly confirms there is no
 * connection. Unknown status is allowed to try the remote request and use the
 * caller's normal cache fallback if it fails.
 */
export async function isNetworkAvailable() {
  return (await getNetworkAvailability()) !== "offline";
}
