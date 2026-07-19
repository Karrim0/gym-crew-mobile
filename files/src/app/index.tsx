import { Redirect } from "expo-router";
import { View } from "react-native";
import { LoadingState } from "@/components/ui/states";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSessionStore } from "@/stores/session-store";

export default function Index() {
  const { colors } = useAppTheme();
  const initialized = useSessionStore((state) => state.initialized);
  const loadingContext = useSessionStore((state) => state.loadingContext);
  const contextStatus = useSessionStore((state) => state.contextStatus);
  const session = useSessionStore((state) => state.session);
  const membership = useSessionStore((state) => state.membership);

  if (!initialized || loadingContext || contextStatus === "loading") {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><LoadingState /></View>;
  }
  if (!session) return <Redirect href="/(auth)/login" />;
  if (contextStatus === "missing" && !membership) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)/home" />;
}
