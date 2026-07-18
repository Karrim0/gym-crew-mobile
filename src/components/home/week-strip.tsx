import { ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { weekdayLabel } from "@/constants/schedule";
import type { WeeklyScheduleDayWithDetails } from "@/types";
import { toISODateOnly } from "@/lib/utils/date";

export function WeekStrip({ days }: { days: WeeklyScheduleDayWithDetails[] }) {
  const { colors } = useAppTheme();
  const language = useSettingsStore((state) => state.language);
  const today = toISODateOnly();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {days.map((day) => {
        const selected = day.scheduleDate === today;
        const rest = day.workoutType === "rest";
        return (
          <View
            key={day.id}
            style={{
              width: 88,
              minHeight: 92,
              padding: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primarySoft : colors.surface,
              justifyContent: "space-between",
              gap: spacing.xs,
            }}
          >
            <AppText variant="caption" color={selected ? "primary" : "muted"} align="center">
              {weekdayLabel(day.sourceDay?.weekday ?? "saturday", language)}
            </AppText>
            <AppText variant="smallBold" align="center" numberOfLines={2}>
              {rest ? (language === "ar" ? "راحة" : "Rest") : day.displayName}
            </AppText>
            <AppText variant="caption" color="faint" align="center">
              {rest ? "—" : `${day.exercises.length} ${language === "ar" ? "تمرين" : "ex."}`}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}
