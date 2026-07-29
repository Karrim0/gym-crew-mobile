import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_ANDROID_PERMISSIONS,
  compareSemver,
  containsPrivateCredential,
  extractAndroidPermissions,
  findUnexpectedAndroidPermissions,
  isSafePublicEnvName,
  parseSemver,
} from "./phase6-release-policy.mjs";

test("stable semantic versions are parsed", () => {
  assert.deepEqual(parseSemver("1.0.0"), [1, 0, 0]);
  assert.equal(parseSemver("1.0.0-rc.1"), null);
});

test("semantic versions compare deterministically", () => {
  assert.equal(compareSemver("1.0.0", "0.6.0"), 1);
  assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  assert.equal(compareSemver("0.9.9", "1.0.0"), -1);
});

test("Android permissions are extracted from the manifest", () => {
  const manifest = '<uses-permission android:name="android.permission.INTERNET"/>\n<uses-permission android:name="android.permission.VIBRATE"/>';
  assert.deepEqual(extractAndroidPermissions(manifest), [
    "android.permission.INTERNET",
    "android.permission.VIBRATE",
  ]);
});

test("release permission allowlist rejects sensitive leftovers", () => {
  const manifest = '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>';
  assert.deepEqual(findUnexpectedAndroidPermissions(manifest), [
    "android.permission.SYSTEM_ALERT_WINDOW",
  ]);
  assert.equal(ALLOWED_ANDROID_PERMISSIONS.has("android.permission.INTERNET"), true);
});

test("private credentials are detected", () => {
  assert.equal(containsPrivateCredential("SUPABASE_SERVICE_ROLE_KEY=x"), true);
  assert.equal(containsPrivateCredential("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=x"), false);
});

test("only expected public mobile environment names are accepted", () => {
  assert.equal(isSafePublicEnvName("EXPO_PUBLIC_SUPABASE_URL"), true);
  assert.equal(isSafePublicEnvName("SUPABASE_SERVICE_ROLE_KEY"), false);
});
