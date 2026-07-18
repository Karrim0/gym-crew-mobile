import { Pressable, View } from "react-native";
import { ChevronLeft, ChevronRight, MoonStar } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSettingsStore } from "@/stores/settings-store";
import { weekdayLabel, workoutTypeLabel } from "@/constants/schedule";
import type { SplitDayWithDetails } from "@/types";
import { spacing } from "@/lib/theme/tokens";

export function DayCard({ day, onPress }: { day: SplitDayWithDetails; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { isRTL, rowDirection } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  const rest = day.workoutType === "rest";
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: rest ? colors.surfaceMuted : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          {rest ? <MoonStar color={colors.warning} size={24} /> : <AppText variant="bodyStrong" color="primary" align="center">{weekdayLabel(day.weekday, language).slice(0, 2)}</AppText>}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{day.displayName || workoutTypeLabel(day.workoutType, language)}</AppText>
          <AppText variant="small" color="muted" numberOfLines={1}>
            {rest ? workoutTypeLabel("rest", language) : `${day.exercises.length} ${language === "ar" ? "تمرين" : "exercises"} · ${day.focusLabel || workoutTypeLabel(day.workoutType, language)}`}
          </AppText>
        </View>
        <Arrow color={colors.textFaint} size={20} />
      </Card>
    </Pressable>
  );
}
