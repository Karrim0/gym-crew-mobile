import { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack, useRouter, useSegments, type ErrorBoundaryProps, type Href } from "expo-router";
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
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/app-text";
import { useTranslation } from "@/lib/localization/use-translation";

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors } = useAppTheme();
  const { language } = useTranslation();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
        <AppText variant="title1" color="danger">!</AppText>
      </View>
      <AppText variant="title2" align="center">{language === "ar" ? "حصلت مشكلة مؤقتة" : "Something went wrong"}</AppText>
      <AppText color="muted" align="center">{language === "ar" ? "بيانات تمرينك المحلية آمنة. جرّب فتح الشاشة تاني." : "Your local workout data is safe. Try opening the screen again."}</AppText>
      <Button style={{ alignSelf: "stretch", maxWidth: 360 }} onPress={retry}>{language === "ar" ? "حاول تاني" : "Try again"}</Button>
    </GestureHandlerRootView>
  );
}

function RouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const initialized = useSessionStore((state) => state.initialized);
  const loadingContext = useSessionStore((state) => state.loadingContext);
  const session = useSessionStore((state) => state.session);
  const membership = useSessionStore((state) => state.membership);
  const contextStatus = useSessionStore((state) => state.contextStatus);

  useEffect(() => {
    if (!initialized || loadingContext || contextStatus === "loading" || contextStatus === "unavailable") return;
    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";
    if (!session && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }
    if (session && contextStatus === "missing" && !membership && !inOnboarding) {
      router.replace("/(onboarding)");
      return;
    }
    if (session && membership && (inAuth || inOnboarding)) router.replace("/(tabs)/home");
  }, [contextStatus, initialized, loadingContext, membership, router, segments, session]);
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
  const { language } = useTranslation();
  const initialized = useSessionStore((state) => state.initialized);
  const initialize = useSessionStore((state) => state.initialize);
  const initializeConnectivity = useConnectivityStore((state) => state.initialize);
  const syncNow = useConnectivityStore((state) => state.syncNow);
  const session = useSessionStore((state) => state.session);
  const contextStatus = useSessionStore((state) => state.contextStatus);
  const contextError = useSessionStore((state) => state.error);
  const refreshContext = useSessionStore((state) => state.refreshContext);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeConnectivity: (() => void) | undefined;
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncNow();
        void refreshContext();
      }
    });
    void (async () => {
      const authTask = initialize()
        .then((unsubscribe) => { unsubscribeAuth = unsubscribe; })
        .catch(() => undefined);
      const connectivityTask = initializeConnectivity()
        .then((unsubscribe) => { unsubscribeConnectivity = unsubscribe; })
        .catch(() => undefined);
      void connectivityTask;
      await Promise.allSettled([getDatabase(), prepareNotifications(), authTask]);
      void flushSyncQueue();
      await SplashScreen.hideAsync().catch(() => undefined);
    })();
    return () => {
      appState.remove();
      unsubscribeAuth?.();
      unsubscribeConnectivity?.();
    };
  }, [initialize, initializeConnectivity, refreshContext, syncNow]);

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><LoadingState /></View>;
  }

  if (session && contextStatus === "unavailable") {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: colors.warningSoft, alignItems: "center", justifyContent: "center" }}>
          <AppText variant="title1">↻</AppText>
        </View>
        <AppText variant="title2" align="center">{language === "ar" ? "بيانات الجهاز لسه مش جاهزة" : "On-device data is not ready yet"}</AppText>
        <AppText color="muted" align="center">{contextError ?? (language === "ar" ? "افتح التطبيق مرة واحدة بالإنترنت علشان نحفظ بيانات الجيم على الجهاز." : "Open the app once online so your gym data can be saved on this device.")}</AppText>
        <Button style={{ alignSelf: "stretch", maxWidth: 360 }} onPress={() => void refreshContext()}>{language === "ar" ? "حاول تاني" : "Try again"}</Button>
      </GestureHandlerRootView>
    );
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
