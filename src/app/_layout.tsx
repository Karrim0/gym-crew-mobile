import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getDatabase } from "@/lib/offline/database";
import { flushSyncQueue } from "@/lib/offline/sync";
import { prepareNotifications } from "@/lib/notifications/rest-notifications";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSessionStore } from "@/stores/session-store";
import { LoadingState } from "@/components/ui/states";
import { View } from "react-native";

void SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const initialized = useSessionStore((state) => state.initialized);
  const session = useSessionStore((state) => state.session);
  const membership = useSessionStore((state) => state.membership);

  useEffect(() => {
    if (!initialized) return;
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
    if (session && membership && (inAuth || inOnboarding)) {
      router.replace("/(tabs)/home");
    }
  }, [initialized, membership, router, segments, session]);

  return null;
}

export default function RootLayout() {
  const { resolved, colors } = useAppTheme();
  const initialized = useSessionStore((state) => state.initialized);
  const initialize = useSessionStore((state) => state.initialize);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      await Promise.allSettled([getDatabase(), prepareNotifications()]);
      unsubscribe = await initialize();
      void flushSyncQueue();
      await SplashScreen.hideAsync();
    })();
    return () => unsubscribe?.();
  }, [initialize]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <RouteGuard />
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
        <Stack.Screen name="workout/[sessionId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="split-day/[dayId]" />
        <Stack.Screen name="exercise-picker" options={{ presentation: "modal" }} />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
