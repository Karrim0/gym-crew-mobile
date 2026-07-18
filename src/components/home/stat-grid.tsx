import { View } from "react-native";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { spacing } from "@/lib/theme/tokens";
import { useTranslation } from "@/lib/localization/use-translation";

export function StatGrid({ sessions, streak, volume }: { sessions: number; streak: number; volume: number }) {
  const { t, rowDirection } = useTranslation();
  const stats = [
    { value: sessions, label: t("home.sessions") },
    { value: streak, label: t("home.streak") },
    { value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume), label: t("home.volume") },
  ];
  return (
    <View style={{ flexDirection: rowDirection, gap: spacing.sm, flexWrap: "wrap" }}>
      {stats.map((stat) => (
        <Card key={stat.label} style={{ flexGrow: 1, flexBasis: 105, gap: 4, padding: spacing.md }}>
          <AppText variant="title2">{stat.value}</AppText>
          <AppText variant="caption" color="muted">{stat.label}</AppText>
        </Card>
      ))}
    </View>
  );
}
