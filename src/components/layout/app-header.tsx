import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { BrandWordmark } from "@/components/brand/brand-mark";
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
  const resolvedSubtitle = subtitle ?? (language === "ar" ? "امتلك السِت اللي قدامك." : "Own the next set.");

  return (
    <View style={{ gap: compact ? spacing.sm : spacing.md }}>
      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <BrandWordmark compact />
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 8 }}>
          <Link href="/notifications" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "ar" ? `الإشعارات${unread ? `، ${unread} غير مقروءة` : ""}` : `Notifications${unread ? `, ${unread} unread` : ""}`}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.68 : 1,
              })}
            >
              <Bell size={19} color={colors.text} />
              {unread > 0 ? <View style={{ position: "absolute", top: 7, end: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface }} /> : null}
            </Pressable>
          </Link>
          <Link href="/(tabs)/profile" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={language === "ar" ? "فتح الحساب" : "Open profile"} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Avatar name={profile?.displayName ?? "OVRLD"} url={profile?.avatarUrl ?? null} size={42} ring />
            </Pressable>
          </Link>
        </View>
      </View>
      {resolvedTitle ? (
        <View style={{ gap: 2 }}>
          <AppText variant={compact ? "title3" : "title2"} numberOfLines={1}>{resolvedTitle}</AppText>
          {resolvedSubtitle ? <AppText variant="small" color="muted" numberOfLines={2}>{resolvedSubtitle}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}
