import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { colors } = useAppTheme();
  const { rowDirection, t } = useTranslation();
  const profile = useSessionStore((state) => state.profile);
  const unread = useNotificationCenterStore((state) => state.items.filter((item) => !item.readAt).length);
  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
      <Link href="/profile" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={profile?.displayName ?? "Profile"} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <Avatar name={profile?.displayName} url={profile?.avatarUrl} size={50} ring />
        </Pressable>
      </Link>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText variant="title2" numberOfLines={1}>{title ?? t("common.appName")}</AppText>
        {subtitle ? <AppText variant="small" color="muted" numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      <Link href="/notifications" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <Bell size={21} color={colors.textMuted} />
          {unread ? <View style={{ position: "absolute", top: 5, right: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface }} /> : null}
        </Pressable>
      </Link>
    </View>
  );
}
