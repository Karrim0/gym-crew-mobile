export const RELEASE_VERSION = "1.0.0";
export const RELEASE_BUILD_NUMBER = 8;

export const ALLOWED_ANDROID_PERMISSIONS = new Set([
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.ACCESS_WIFI_STATE",
  "android.permission.VIBRATE",
]);

export function parseSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return match.slice(1).map(Number);
}

export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) throw new Error("Both values must be stable semantic versions.");
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

export function extractAndroidPermissions(manifest) {
  return [...String(manifest).matchAll(/<uses-permission\s+android:name="([^"]+)"[^>]*\/>/g)]
    .map((match) => match[1]);
}

export function findUnexpectedAndroidPermissions(manifest) {
  return extractAndroidPermissions(manifest)
    .filter((permission) => !ALLOWED_ANDROID_PERMISSIONS.has(permission));
}

export function containsPrivateCredential(value) {
  const source = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//") && !line.startsWith("*"))
    .join("\n")
    .toLowerCase();
  return [
    "service_role",
    "service-role",
    "private_key",
    "begin private key",
    "supabase_service",
    "sk_live_",
    "sk-proj-",
  ].some((token) => source.includes(token));
}

export function isSafePublicEnvName(name) {
  return [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_WEB_API_URL",
  ].includes(String(name));
}
