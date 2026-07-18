import { Redirect } from "expo-router";
import { useSessionStore } from "@/stores/session-store";

export default function Index() {
  const session = useSessionStore((state) => state.session);
  const membership = useSessionStore((state) => state.membership);
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!membership) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)/home" />;
}
