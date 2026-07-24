import { useEffect } from "react";
import { AppState, Pressable, View } from "react-native";
import {
  Stack,
  useRouter,
  useSegments,
  type ErrorBoundaryProps,
  type Href,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RefreshCw, ShieldAlert, WifiOff } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDatabase } from "@/lib/offline/database";
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

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors } = useAppTheme();
  const { language } = useTranslation();
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 26,
          backgroundColor: colors.dangerSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText variant="title1" color="danger">
          !
        </AppText>
      </View>
      <AppText variant="title2" align="center">
        {language === "ar" ? "حصلت مشكلة مؤقتة" : "Something went wrong"}
      </AppText>
      <AppText color="muted" align="center">
        {language === "ar"
          ? "بيانات تمرينك المحلية آمنة. جرّب فتح الشاشة تاني."
          : "Your local workout data is safe. Try opening the screen again."}
      </AppText>
      <Button
        style={{ alignSelf: "stretch", maxWidth: 360 }}
        onPress={retry}
      >
        {language === "ar" ? "حاول تاني" : "Try again"}
      </Button>
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
    if (
      !initialized ||
      loadingContext ||
      contextStatus === "loading" ||
      contextStatus === "unavailable"
    ) {
      return;
    }

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";

    if (!session && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }

    if (
      session &&
      contextStatus === "missing" &&
      !membership &&
      !inOnboarding
    ) {
      router.replace("/(onboarding)");
      return;
    }

    if (session && membership && (inAuth || inOnboarding)) {
      router.replace("/(tabs)/home");
    }
  }, [
    contextStatus,
    initialized,
    loadingContext,
    membership,
    router,
    segments,
    session,
  ]);

  return null;
}

function NotificationRouter() {
  const router = useRouter();
  const addNotification = useNotificationCenterStore((state) => state.add);
  const markRead = useNotificationCenterStore((state) => state.markRead);

  useEffect(() => {
    const capture = (
      notification: Notifications.Notification,
      read = false,
    ) => {
      const content = notification.request.content;
      const route =
        typeof content.data?.route === "string" &&
        content.data.route.startsWith("/")
          ? content.data.route
          : null;

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
      .then((notifications) =>
        notifications.forEach((notification) => capture(notification)),
      )
      .catch(() => undefined);
    void Notifications.getLastNotificationResponseAsync().then(open);

    const receivedSubscription =
      Notifications.addNotificationReceivedListener((notification) =>
        capture(notification),
      );
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(open);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [addNotification, markRead, router]);

  return null;
}

function BootstrapRecovery() {
  const { colors } = useAppTheme();
  const { language } = useTranslation();
  const retryBootstrap = useSessionStore((state) => state.retryBootstrap);
  const bootstrapStatus = useSessionStore((state) => state.bootstrapStatus);
  const error = useSessionStore((state) => state.error);

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 26,
          backgroundColor: colors.warningSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldAlert color={colors.warning} size={34} />
      </View>
      <AppText variant="title2" align="center">
        {language === "ar"
          ? "مش قادرين نفتح الجلسة دلوقتي"
          : "We could not restore your session"}
      </AppText>
      <AppText color="muted" align="center">
        {language === "ar"
          ? "بيانات تمرينك المحلية آمنة. تأكد من الاتصال وحاول تاني."
          : "Your local workout data is safe. Check the connection and try again."}
      </AppText>
      {error ? (
        <AppText variant="small" color="warning" align="center">
          {error}
        </AppText>
      ) : null}
      <Button
        style={{ alignSelf: "stretch", maxWidth: 360 }}
        loading={bootstrapStatus === "loading"}
        icon={<RefreshCw color={colors.primaryInk} size={18} />}
        onPress={() => void retryBootstrap()}
      >
        {language === "ar" ? "حاول تاني" : "Try again"}
      </Button>
    </GestureHandlerRootView>
  );
}

function WorkspaceRecoveryBanner() {
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  const session = useSessionStore((state) => state.session);
  const contextStatus = useSessionStore((state) => state.contextStatus);
  const contextError = useSessionStore((state) => state.error);
  const loadingContext = useSessionStore((state) => state.loadingContext);
  const refreshContext = useSessionStore((state) => state.refreshContext);

  if (!session || contextStatus !== "unavailable") return null;

  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={["top"]}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <View
        style={{
          marginHorizontal: 12,
          marginTop: 8,
          minHeight: 54,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.warning,
          backgroundColor: colors.warningSoft,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: rowDirection,
          alignItems: "center",
          gap: 10,
          shadowColor: colors.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <WifiOff color={colors.warning} size={20} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="small" color="warning" numberOfLines={1}>
            {language === "ar"
              ? "معروض آخر محتوى محفوظ على الجهاز"
              : "Showing the latest on-device workspace"}
          </AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {contextError ??
              (language === "ar"
                ? "هنحدّث بيانات المساحة لما الاتصال يرجع."
                : "We will refresh the workspace when the connection returns.")}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={loadingContext}
          onPress={() => void refreshContext()}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            borderRadius: 14,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: loadingContext ? 0.45 : pressed ? 0.68 : 1,
          })}
        >
          <RefreshCw color={colors.warning} size={18} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const { resolved, colors } = useAppTheme();
  const initialized = useSessionStore((state) => state.initialized);
  const bootstrapStatus = useSessionStore((state) => state.bootstrapStatus);
  const initialize = useSessionStore((state) => state.initialize);
  const initializeConnectivity = useConnectivityStore(
    (state) => state.initialize,
  );
  const refreshConnectivity = useConnectivityStore((state) => state.refresh);
  const syncNow = useConnectivityStore((state) => state.syncNow);
  const session = useSessionStore((state) => state.session);
  const refreshContext = useSessionStore((state) => state.refreshContext);

  useEffect(() => {
    let active = true;
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeConnectivity: (() => void) | undefined;

    const authTask = initialize()
      .then((unsubscribe) => {
        if (active) unsubscribeAuth = unsubscribe;
        else unsubscribe();
      })
      .catch(() => undefined);

    const connectivityTask = initializeConnectivity()
      .then((unsubscribe) => {
        if (active) unsubscribeConnectivity = unsubscribe;
        else unsubscribe();
      })
      .catch(() => undefined);

    const bootstrapTasks = Promise.allSettled([
      getDatabase(),
      prepareNotifications(),
      authTask,
      connectivityTask,
    ]);

    void Promise.race([bootstrapTasks, delay(6000)]).then(() =>
      SplashScreen.hideAsync().catch(() => undefined),
    );

    void bootstrapTasks.then(() => syncNow());

    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      void refreshConnectivity()
        .then(() => syncNow())
        .catch(() => undefined);
      void refreshContext();
    });

    return () => {
      active = false;
      appState.remove();
      unsubscribeAuth?.();
      unsubscribeConnectivity?.();
    };
  }, [
    initialize,
    initializeConnectivity,
    refreshConnectivity,
    refreshContext,
    syncNow,
  ]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState />
      </View>
    );
  }

  if (bootstrapStatus === "error" && !session) {
    return <BootstrapRecovery />;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <RouteGuard />
      <NotificationRouter />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="workout/[sessionId]"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="workout-history/[sessionId]" />
          <Stack.Screen name="split-day/[dayId]" />
          <Stack.Screen
            name="exercise-picker"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
        </Stack>
        <WorkspaceRecoveryBanner />
      </View>
    </GestureHandlerRootView>
  );
}
