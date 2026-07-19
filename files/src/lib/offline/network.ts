import * as Network from "expo-network";

export async function isNetworkAvailable() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}
