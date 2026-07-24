import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { spacing } from "@/lib/theme/tokens";

export function AppHeader({ title, subtitle, compact = false }: { title?: string; subtitle?: string; compact?: boolean }) {
  const { colors } = useAppTheme();
  const { rowDirection, language } = useTranslation();
  const profile = useSessionStore((state) => state.profile);
  const unread = useNotificationCenterStore((state) => state.items.filter((item) => !item.readAt).length);
  const resolvedTitle = title ?? (language === "ar" ? `أهلاً، ${profile?.displayName || "بطل"}` : `Hi, ${profile?.displayName || "Athlete"}`);
  const resolvedSubtitle = subtitle ?? (language === "ar" ? "خليك مركز في السِت اللي قدامك." : "Own the next set.");

  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: compact ? 52 : 62 }}>
      <Link href="/(tabs)/profile" asChild>
        <Pressable accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <Avatar name={profile?.displayName ?? "Gym Crew"} url={profile?.avatarUrl ?? null} size={compact ? 42 : 48} ring />
        </Pressable>
      </Link>

      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <AppText variant={compact ? "bodyStrong" : "title3"} numberOfLines={1}>{resolvedTitle}</AppText>
        {resolvedSubtitle ? <AppText variant="small" color="muted" numberOfLines={1}>{resolvedSubtitle}</AppText> : null}
      </View>

      <Link href="/notifications" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 15,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.68 : 1,
          })}
        >
          <Bell size={20} color={colors.text} />
          {unread > 0 ? <View style={{ position: "absolute", top: 8, end: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface }} /> : null}
        </Pressable>
      </Link>
    </View>
  );
}
