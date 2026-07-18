import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepareNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("rest-timer", {
      name: "Rest timer",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 300],
      sound: "rest-complete.wav",
    });
  }
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted;
}

export async function scheduleRestComplete(seconds: number, language: "ar" | "en") {
  const allowed = await requestNotificationPermission().catch(() => false);
  if (!allowed || seconds < 1) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: language === "ar" ? "الراحة خلصت" : "Rest complete",
      body: language === "ar" ? "يلا السِت الجاية." : "Ready for your next set.",
      sound: "rest-complete.wav",
      data: { route: "/(tabs)/workout" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: Platform.OS === "android" ? "rest-timer" : undefined,
    },
  });
}

export async function cancelRestNotification(identifier: string | null) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}
