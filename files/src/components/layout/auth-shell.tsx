import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { Dumbbell } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

export function AuthShell({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
    <Screen contentStyle={{ justifyContent: "center", paddingVertical: spacing.xxl }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Dumbbell color={colors.white} size={36} strokeWidth={2.5} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title1" align="center">{t("auth.welcome")}</AppText>
          <AppText color="muted" align="center">{t("auth.subtitle")}</AppText>
        </View>
      </View>
      <Card style={{ gap: spacing.md }}>{children}</Card>
    </Screen>
  );
}
