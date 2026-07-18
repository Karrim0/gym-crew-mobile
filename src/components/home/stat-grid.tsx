import { View } from "react-native";
import { Activity, Dumbbell, Flame } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

export function StatGrid({ sessions, streak, volume }: { sessions: number; streak: number; volume: number }) {
  const { t, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const stats = [
    { value: sessions, label: t("home.sessions"), icon: Dumbbell, tone: colors.primarySoft, color: colors.primary },
    { value: streak, label: t("home.streak"), icon: Flame, tone: colors.warningSoft, color: colors.warning },
    { value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume), label: t("home.volume"), icon: Activity, tone: colors.successSoft, color: colors.success },
  ];
  return (
    <View style={{ flexDirection: rowDirection, gap: spacing.sm, flexWrap: "wrap" }}>
      {stats.map(({ icon: Icon, ...stat }) => (
        <Card key={stat.label} style={{ flexGrow: 1, flexBasis: 105, gap: 8, padding: spacing.md }} elevated={false}>
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: stat.tone, alignItems: "center", justifyContent: "center" }}><Icon size={19} color={stat.color} /></View>
          <AppText variant="title2">{stat.value}</AppText>
          <AppText variant="caption" color="muted" numberOfLines={2}>{stat.label}</AppText>
        </Card>
      ))}
    </View>
  );
}
