import { Pressable, View } from "react-native";
import { ChevronLeft, ChevronRight, Dumbbell, MoonStar } from "lucide-react-native";
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
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, borderColor: rest ? colors.border : colors.primarySoft }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: rest ? colors.warningSoft : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          {rest ? <MoonStar color={colors.warning} size={24} /> : <Dumbbell color={colors.primary} size={23} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <AppText variant="caption" color="muted">{weekdayLabel(day.weekday, language)}</AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>{day.displayName || workoutTypeLabel(day.workoutType, language)}</AppText>
          <AppText variant="small" color="muted" numberOfLines={1}>{rest ? workoutTypeLabel("rest", language) : `${day.exercises.length} ${language === "ar" ? "تمرين" : "exercises"} · ${day.focusLabel || workoutTypeLabel(day.workoutType, language)}`}</AppText>
        </View>
        <Arrow color={colors.textFaint} size={20} />
      </Card>
    </Pressable>
  );
}
