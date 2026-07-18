import { Pressable, View } from "react-native";
import { Link } from "expo-router";
import { Settings, UserRound } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { colors } = useAppTheme();
  const { rowDirection, t } = useTranslation();
  const profile = useSessionStore((state) => state.profile);
  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="title2" numberOfLines={1}>{title ?? t("common.appName")}</AppText>
        {subtitle ? <AppText variant="small" color="muted" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      <View style={{ flexDirection: rowDirection, gap: 8 }}>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityLabel={t("settings.title")}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Settings size={20} color={colors.text} />
          </Pressable>
        </Link>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          {profile?.displayName ? (
            <AppText variant="bodyStrong" color="primary" align="center">{profile.displayName.trim().slice(0, 1).toUpperCase()}</AppText>
          ) : (
            <UserRound size={20} color={colors.primary} />
          )}
        </View>
      </View>
    </View>
  );
}
