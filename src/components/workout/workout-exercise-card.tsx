import { Pressable, View } from "react-native";
import { CheckCircle2, ChevronDown, ChevronUp, Dumbbell } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import type { PreviousExercisePerformance, WorkoutExerciseWithDetails } from "@/types";

export function WorkoutExerciseCard({ exercise, previous, index, total, onPress, onMove }: {
  exercise: WorkoutExerciseWithDetails; previous?: PreviousExercisePerformance; index: number; total: number; onPress: () => void; onMove: (direction: -1 | 1) => void;
}) {
  const { colors } = useAppTheme();
  const { t, rowDirection, language } = useTranslation();
  const completed = exercise.sets.filter((set) => set.isCompleted).length;
  const allDone = exercise.sets.length > 0 && completed === exercise.sets.length;
  const bestPrevious = previous?.sets[0];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ padding: spacing.md, opacity: pressed ? .78 : 1, gap: spacing.sm })}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: allDone ? "rgba(22,163,106,.12)" : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            {allDone ? <CheckCircle2 color={colors.success} /> : <Dumbbell color={colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="bodyStrong" numberOfLines={2}>{exercise.exercise.name}</AppText>
            <AppText variant="small" color="muted">{completed}/{exercise.sets.length} {t("common.sets")}</AppText>
            {bestPrevious ? <AppText variant="caption" color="primary">{t("workout.lastTime")}: {bestPrevious.weightKg ?? 0} {t("common.kg")} × {bestPrevious.reps}</AppText> : null}
          </View>
          <Pill selected={allDone}>{allDone ? t("common.done") : language === "ar" ? "ابدأ" : "Open"}</Pill>
        </View>
      </Pressable>
      <View style={{ flexDirection: rowDirection, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Pressable accessibilityLabel="move up" disabled={index === 0} onPress={() => onMove(-1)} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: index === 0 ? .25 : 1 }}><ChevronUp size={19} color={colors.textMuted} /></Pressable>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Pressable accessibilityLabel="move down" disabled={index === total - 1} onPress={() => onMove(1)} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: index === total - 1 ? .25 : 1 }}><ChevronDown size={19} color={colors.textMuted} /></Pressable>
      </View>
    </Card>
  );
}
