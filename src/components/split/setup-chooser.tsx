import { Alert, View } from "react-native";
import { FileUp, LayoutList, Sparkles } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

export function SetupChooser({ onManual, onStarter, loading }: { onManual: () => void; onStarter: () => void; loading: boolean }) {
  const { t, rowDirection, language } = useTranslation();
  const { colors } = useAppTheme();
  const options = [
    { icon: LayoutList, title: t("split.createManually"), desc: language === "ar" ? "ابدأ بأسبوع فاضي وركّبه بطريقتك." : "Start with an empty week and build it your way.", action: onManual },
    { icon: Sparkles, title: t("split.starterPlan"), desc: language === "ar" ? "اختار نقطة بداية وعدّلها براحتك." : "Pick a starting point and customize it.", action: onStarter },
    { icon: FileUp, title: t("split.importPlan"), desc: language === "ar" ? "رفع صورة أو ملف هيتضاف في المرحلة الجاية للموبايل." : "Photo and file import arrives in the next mobile phase.", action: () => Alert.alert(t("split.importPlan"), t("common.comingSoon")) },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      {options.map(({ icon: Icon, title, desc, action }, index) => (
        <Card key={title} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Icon color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <AppText variant="bodyStrong">{title}</AppText>
              <AppText variant="small" color="muted">{desc}</AppText>
            </View>
          </View>
          <Button variant={index === 0 ? "primary" : "secondary"} loading={loading && index === 0} onPress={action}>{title}</Button>
        </Card>
      ))}
    </View>
  );
}
