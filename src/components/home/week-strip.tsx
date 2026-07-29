import { View } from "react-native";
import { Check, Dumbbell, MoonStar } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { weekdayLabel } from "@/constants/schedule";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";
import { getWeekdayFromISODate, todayISODateOnly } from "@/lib/utils/date";

export function WeekStrip({ schedule, sessions = [] }: { schedule: WeeklyScheduleDayWithDetails[]; sessions?: WorkoutSessionWithDetails[] }) {
  const { colors } = useAppTheme();
  const language = useSettingsStore((state) => state.language);
  const today = todayISODateOnly();
  const completedDates = new Set(sessions.filter((session) => session.status === "completed").map((session) => session.scheduledDate));

  return (
    <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
      {schedule.map((day) => {
        const selected = day.scheduleDate === today;
        const rest = day.workoutType === "rest";
        const completed = completedDates.has(day.scheduleDate);
        const activeColor = completed ? colors.success : selected ? colors.primary : colors.surfaceStrong;
        return (
          <View key={day.id} style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 7 }}>
            <View
              style={{
                width: "100%",
                maxWidth: 44,
                aspectRatio: 0.78,
                borderRadius: 16,
                backgroundColor: selected ? colors.primaryMuted : colors.surfaceSunken,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: rest ? colors.surfaceStrong : activeColor, alignItems: "center", justifyContent: "center" }}>
                {completed ? <Check size={15} color={colors.primaryInk} /> : rest ? <MoonStar size={13} color={colors.textMuted} /> : selected ? <Dumbbell size={14} color={colors.primaryInk} /> : <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textFaint }} />}
              </View>
            </View>
            <AppText variant="caption" color={selected ? "primary" : "muted"} align="center" numberOfLines={1}>
              {weekdayLabel(getWeekdayFromISODate(day.scheduleDate), language).slice(0, language === "ar" ? 3 : 2)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
