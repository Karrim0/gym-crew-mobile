import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { ShieldCheck, WifiOff } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { PhotoHero } from "@/components/brand/photo-hero";
import { brandImages } from "@/lib/brand/workout-visuals";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { spacing } from "@/lib/theme/tokens";
import { useTranslation } from "@/lib/localization/use-translation";

export function AuthShell({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  return (
    <Screen showConnectivity={false} contentStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.lg }}>
      <PhotoHero source={brandImages.strength} height={292} topRight={<BrandWordmark compact onDark />}>
        <View style={{ gap: 8 }}>
          <AppText variant="overline" color="primary">PROGRESSIVE OVERLOAD</AppText>
          <AppText variant="hero" style={{ color: colors.textOnDark }}>
            {language === "ar" ? "تدرّب بأرقام.\nاتقدّم بوضوح." : "Train by numbers.\nProgress on purpose."}
          </AppText>
          <AppText variant="small" style={{ color: colors.textOnDarkMuted }}>
            {language === "ar" ? "جدولك، أوزانك، وتقدمك محفوظين حتى من غير نت." : "Your plan, loads, and progress stay safe—even offline."}
          </AppText>
        </View>
      </PhotoHero>

      <View style={{ flexDirection: rowDirection, gap: 14, flexWrap: "wrap", paddingHorizontal: 4 }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><ShieldCheck color={colors.primary} size={16} /><AppText variant="caption" color="muted">{language === "ar" ? "بيانات آمنة" : "Safe data"}</AppText></View>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><WifiOff color={colors.primary} size={16} /><AppText variant="caption" color="muted">{language === "ar" ? "يشتغل أوفلاين" : "Offline ready"}</AppText></View>
      </View>

      <Card elevated style={{ gap: spacing.md, padding: spacing.lg, borderRadius: 24 }}>{children}</Card>
    </Screen>
  );
}
