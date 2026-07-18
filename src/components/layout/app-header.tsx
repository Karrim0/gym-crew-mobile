import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Bell, Settings } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { IconButton } from "@/components/ui/icon-button";
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
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText variant="title2" numberOfLines={1}>{title ?? t("common.appName")}</AppText>
        {subtitle ? <AppText variant="small" color="muted" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      <View style={{ flexDirection: rowDirection, gap: 8, alignItems: "center" }}>
        <Link href="/notifications" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Bell size={20} color={colors.text} />
            {unread ? <View style={{ position: "absolute", top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.background, alignItems: "center", justifyContent: "center" }}><AppText variant="caption" style={{ color: colors.white, fontSize: 10, lineHeight: 12 }}>{Math.min(unread, 99)}</AppText></View> : null}
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <IconButton accessibilityLabel={t("settings.title")} icon={<Settings size={20} color={colors.text} />} />
        </Link>
        <Link href="/profile" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={profile?.displayName ?? "Profile"} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Avatar name={profile?.displayName} url={profile?.avatarUrl} size={46} ring />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
