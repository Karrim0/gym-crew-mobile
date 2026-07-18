import { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getDatabase } from "@/lib/offline/database";
import { flushSyncQueue } from "@/lib/offline/sync";
import { prepareNotifications } from "@/lib/notifications/rest-notifications";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSessionStore } from "@/stores/session-store";
import { useConnectivityStore } from "@/stores/connectivity-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { LoadingState } from "@/components/ui/states";

void SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const initialized = useSessionStore((state) => state.initialized);
  const loadingContext = useSessionStore((state) => state.loadingContext);
  const session = useSessionStore((state) => state.session);
  const membership = useSessionStore((state) => state.membership);

  useEffect(() => {
    if (!initialized || loadingContext) return;
    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";
    if (!session && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }
    if (session && !membership && !inOnboarding) {
      router.replace("/(onboarding)");
      return;
    }
    if (session && membership && (inAuth || inOnboarding)) router.replace("/(tabs)/home");
  }, [initialized, loadingContext, membership, router, segments, session]);
  return null;
}

function NotificationRouter() {
  const router = useRouter();
  const addNotification = useNotificationCenterStore((state) => state.add);
  const markRead = useNotificationCenterStore((state) => state.markRead);

  useEffect(() => {
    const capture = (notification: Notifications.Notification, read = false) => {
      const content = notification.request.content;
      const route = typeof content.data?.route === "string" && content.data.route.startsWith("/") ? content.data.route : null;
      addNotification({
        id: notification.request.identifier,
        title: content.title ?? "Gym Crew",
        body: content.body ?? "",
        route,
        createdAt: new Date(notification.date).toISOString(),
        ...(read ? { readAt: new Date().toISOString() } : {}),
      });
      return route;
    };
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const route = capture(response.notification, true);
      markRead(response.notification.request.identifier);
      Notifications.clearLastNotificationResponse();
      if (route) router.push(route as Href);
    };

    void Notifications.getPresentedNotificationsAsync()
      .then((notifications) => notifications.forEach((notification) => capture(notification)))
      .catch(() => undefined);
    void Notifications.getLastNotificationResponseAsync().then(open);
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => capture(notification));
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [addNotification, markRead, router]);
  return null;
}

export default function RootLayout() {
  const { resolved, colors } = useAppTheme();
  const initialized = useSessionStore((state) => state.initialized);
  const initialize = useSessionStore((state) => state.initialize);
  const initializeConnectivity = useConnectivityStore((state) => state.initialize);
  const syncNow = useConnectivityStore((state) => state.syncNow);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeConnectivity: (() => void) | undefined;
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncNow();
    });
    void (async () => {
      await Promise.allSettled([getDatabase(), prepareNotifications()]);
      unsubscribeConnectivity = await initializeConnectivity();
      unsubscribeAuth = await initialize();
      void flushSyncQueue();
      await SplashScreen.hideAsync();
    })();
    return () => {
      appState.remove();
      unsubscribeAuth?.();
      unsubscribeConnectivity?.();
    };
  }, [initialize, initializeConnectivity, syncNow]);

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><LoadingState /></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <RouteGuard />
      <NotificationRouter />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/[sessionId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout-history/[sessionId]" />
        <Stack.Screen name="split-day/[dayId]" />
        <Stack.Screen name="exercise-picker" options={{ presentation: "modal" }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
