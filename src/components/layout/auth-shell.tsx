import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { Dumbbell, ShieldCheck, WifiOff } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { spacing } from "@/lib/theme/tokens";
import { useTranslation } from "@/lib/localization/use-translation";

export function AuthShell({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  return (
    <Screen showConnectivity={false} contentStyle={{ justifyContent: "center", paddingVertical: spacing.xl, gap: spacing.xl }}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Dumbbell color={colors.primaryInk} size={31} strokeWidth={2.8} />
        </View>
        <View style={{ gap: 6 }}>
          <AppText variant="title1">{language === "ar" ? "تمرّن بتركيز." : "Train with intent."}</AppText>
          <AppText color="muted">{language === "ar" ? "جدولك، أوزانك، وتقدمك محفوظين حتى من غير نت." : "Your plan, numbers, and progress stay safe—even offline."}</AppText>
        </View>
        <View style={{ flexDirection: rowDirection, gap: 12, flexWrap: "wrap" }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><ShieldCheck color={colors.primary} size={16} /><AppText variant="caption" color="muted">{language === "ar" ? "بيانات آمنة" : "Safe data"}</AppText></View>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><WifiOff color={colors.primary} size={16} /><AppText variant="caption" color="muted">{language === "ar" ? "يشتغل أوفلاين" : "Offline ready"}</AppText></View>
        </View>
      </View>
      <Card elevated style={{ gap: spacing.md, padding: spacing.lg }}>{children}</Card>
    </Screen>
  );
}
