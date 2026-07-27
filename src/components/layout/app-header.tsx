import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { spacing } from "@/lib/theme/tokens";

export function AppHeader({ title, subtitle, compact = false }: { title?: string; subtitle?: string; compact?: boolean }) {
  const { colors, resolved } = useAppTheme();
  const { rowDirection, language } = useTranslation();
  const profile = useSessionStore((state) => state.profile);
  const unread = useNotificationCenterStore((state) => state.items.filter((item) => !item.readAt).length);
  const resolvedTitle = title ?? (language === "ar" ? `أهلاً، ${profile?.displayName || "بطل"}` : `Hi, ${profile?.displayName || "Athlete"}`);
  const resolvedSubtitle = subtitle ?? (language === "ar" ? "ركّز في الرقم اللي قدامك." : "Own the number in front of you.");

  const glassButton = {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };

  return (
    <View style={{ gap: compact ? spacing.sm : 14 }}>
      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <BrandWordmark compact />
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 8 }}>
          <Link href="/notifications" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "ar" ? `الإشعارات${unread ? `، ${unread} مش مقروءة` : ""}` : `Notifications${unread ? `, ${unread} unread` : ""}`}
              style={({ pressed }) => ({ ...glassButton, opacity: pressed ? 0.68 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <BlurView pointerEvents="none" intensity={resolved === "dark" ? 20 : 38} tint={resolved} style={{ position: "absolute", inset: 0 }} />
              <Bell size={18} color={colors.text} />
              {unread > 0 ? <View style={{ position: "absolute", top: 6, end: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface }} /> : null}
            </Pressable>
          </Link>
          <Link href="/(tabs)/profile" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={language === "ar" ? "افتح حسابي" : "Open profile"} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Avatar name={profile?.displayName ?? "OVRLD"} url={profile?.avatarUrl ?? null} size={40} ring />
            </Pressable>
          </Link>
        </View>
      </View>
      {resolvedTitle ? (
        <View style={{ gap: 1 }}>
          <AppText variant={compact ? "title3" : "title2"} numberOfLines={1}>{resolvedTitle}</AppText>
          {resolvedSubtitle ? <AppText variant="small" color="muted" numberOfLines={2}>{resolvedSubtitle}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}
