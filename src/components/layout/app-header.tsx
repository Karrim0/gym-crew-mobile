import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell, Settings2 } from "lucide-react-native";
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
  const resolvedTitle = title ?? (language === "ar" ? `أهلاً، ${profile?.displayName || "كرو"}` : `Hi, ${profile?.displayName || "Crew"}`);
  const resolvedSubtitle = subtitle ?? (language === "ar" ? "جاهز تخلي تمرينتك تتحسب؟" : "Ready to make today count?");

  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: compact ? 54 : 68 }}>
      <Link href="/profile" asChild>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <Avatar name={profile?.displayName ?? "Gym Crew"} url={profile?.avatarUrl ?? null} size={compact ? 44 : 52} />
        </Pressable>
      </Link>

      <View style={{ flex: 1, minWidth: 0, gap: compact ? 1 : 3 }}>
        <AppText variant={compact ? "bodyStrong" : "title3"} numberOfLines={1}>{resolvedTitle}</AppText>
        {resolvedSubtitle ? <AppText variant={compact ? "caption" : "small"} color="muted" numberOfLines={1}>{resolvedSubtitle}</AppText> : null}
      </View>

      <View style={{ flexDirection: rowDirection, gap: 8 }}>
        <Link href="/notifications" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: compact ? 42 : 46,
              height: compact ? 42 : 46,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Bell size={20} color={colors.text} />
            {unread > 0 ? <View style={{ position: "absolute", top: 8, end: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface }} /> : null}
          </Pressable>
        </Link>
        {!compact ? (
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Settings2 size={20} color={colors.textMuted} />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}
