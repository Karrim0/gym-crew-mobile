import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import type { MuscleGroup } from "@/types";

const labels: Record<MuscleGroup, { ar: string; en: string }> = {
  chest: { ar: "الصدر", en: "Chest" }, back: { ar: "الظهر", en: "Back" }, shoulders: { ar: "الكتف", en: "Shoulders" },
  biceps: { ar: "الباي", en: "Biceps" }, triceps: { ar: "التراي", en: "Triceps" }, quads: { ar: "الأمامية", en: "Quads" },
  hamstrings: { ar: "الخلفية", en: "Hamstrings" }, glutes: { ar: "الجلوتس", en: "Glutes" }, calves: { ar: "السمانة", en: "Calves" }, core: { ar: "الكور", en: "Core" },
};

function Body({ active }: { active: MuscleGroup }) {
  const { colors } = useAppTheme();
  const hi = colors.primary;
  const dim = colors.surfaceStrong;
  const isUpper = ["chest", "back", "shoulders", "biceps", "triceps"].includes(active);
  const isCore = active === "core";
  const isLeg = ["quads", "hamstrings", "glutes", "calves"].includes(active);
  return (
    <Svg width={76} height={112} viewBox="0 0 76 112" accessibilityLabel="muscle map">
      <Circle cx="38" cy="11" r="9" fill={dim} />
      <Path d="M25 25 Q38 18 51 25 L57 57 Q48 65 47 82 L43 106 H34 L29 82 Q28 65 19 57Z" fill={dim} />
      <Path d="M22 29 L9 55 L15 59 L28 42Z" fill={isUpper ? hi : dim} opacity={active === "biceps" || active === "triceps" ? 1 : .82} />
      <Path d="M54 29 L67 55 L61 59 L48 42Z" fill={isUpper ? hi : dim} opacity={active === "biceps" || active === "triceps" ? 1 : .82} />
      <Path d="M27 27 Q38 22 49 27 L47 49 Q38 54 29 49Z" fill={isUpper ? hi : dim} opacity={active === "chest" || active === "back" || active === "shoulders" ? 1 : .55} />
      <Path d="M30 49 H46 L45 69 H31Z" fill={isCore ? hi : dim} />
      <Path d="M30 67 L37 67 L35 106 H25Z" fill={isLeg ? hi : dim} />
      <Path d="M39 67 L46 67 L51 106 H41Z" fill={isLeg ? hi : dim} />
    </Svg>
  );
}

export function MuscleCard({ primary, secondary = [] }: { primary: MuscleGroup; secondary?: MuscleGroup[] }) {
  const { language } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 14 }}>
      <View style={{ width: 92, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: 18, padding: 6 }}>
        <Body active={primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <AppText variant="caption" color="muted">{language === "ar" ? "العضلة الأساسية" : "Primary muscle"}</AppText>
        <AppText variant="title3">{labels[primary][language]}</AppText>
        {secondary.length ? (
          <AppText variant="small" color="muted" numberOfLines={2}>
            {language === "ar" ? "مساعدة: " : "Also: "}{secondary.map((m) => labels[m][language]).join("، ")}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
