import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldPlaySound: notification.request.content.sound !== null,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function channelId(soundEnabled: boolean, hapticsEnabled: boolean) {
  if (soundEnabled && hapticsEnabled) return "rest-timer";
  if (soundEnabled) return "rest-timer-sound";
  if (hapticsEnabled) return "rest-timer-vibrate";
  return "rest-timer-silent";
}

export async function prepareNotifications() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("rest-timer", {
      name: "Rest timer",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 200, 100, 300],
      sound: "rest_complete.wav",
    }),
    Notifications.setNotificationChannelAsync("rest-timer-sound", {
      name: "Rest timer (sound only)",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: false,
      sound: "rest_complete.wav",
    }),
    Notifications.setNotificationChannelAsync("rest-timer-vibrate", {
      name: "Rest timer (vibrate only)",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 200, 100, 300],
      sound: null,
    }),
    Notifications.setNotificationChannelAsync("rest-timer-silent", {
      name: "Rest timer (silent)",
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
      sound: null,
    }),
  ]);
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  return current.canAskAgain ? "undetermined" : "denied";
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted;
}

export async function scheduleRestComplete(
  seconds: number,
  language: "ar" | "en",
  options?: { route?: string; soundEnabled?: boolean; hapticsEnabled?: boolean },
) {
  const allowed = await requestNotificationPermission().catch(() => false);
  if (!allowed || seconds < 1) return null;
  const soundEnabled = options?.soundEnabled !== false;
  const hapticsEnabled = options?.hapticsEnabled !== false;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: language === "ar" ? "الراحة خلصت" : "Rest complete",
      body: language === "ar" ? "يلا السِت الجاية." : "Ready for your next set.",
      sound: soundEnabled ? "rest_complete.wav" : false,
      data: { route: options?.route ?? "/(tabs)/workout", kind: "rest_complete" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: Platform.OS === "android" ? channelId(soundEnabled, hapticsEnabled) : undefined,
    },
  });
}

export async function sendTestNotification(language: "ar" | "en", soundEnabled: boolean, hapticsEnabled: boolean) {
  return scheduleRestComplete(2, language, { soundEnabled, hapticsEnabled, route: "/settings" });
}

export async function cancelRestNotification(identifier: string | null) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}
