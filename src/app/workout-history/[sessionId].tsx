import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CalendarDays, ChevronLeft, Dumbbell, Layers3, TimerReset } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { fetchWorkoutSession } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate } from "@/lib/utils/date";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { formatWeight, fromKilograms } from "@/lib/utils/weight";
import { useSettingsStore } from "@/stores/settings-store";
import type { WorkoutSessionWithDetails } from "@/types";

export default function WorkoutHistoryDetailsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { language, rowDirection, isRTL, t } = useTranslation();
  const [session, setSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const value = await fetchWorkoutSession(sessionId);
      if (!value) throw new Error(language === "ar" ? "التمرينة مش موجودة." : "Workout not found.");
      setSession(value);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
    }
  }, [language, sessionId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const summary = useMemo(() => {
    const sets = session?.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted) ?? [];
    return {
      sets: sets.length,
      volume: sets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
      minutes: Math.max(1, Math.round((session?.durationSeconds ?? 0) / 60)),
    };
  }, [session]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error || !session) return <Screen><ErrorState message={error ?? "Workout not found"} onRetry={() => void load()} /></Screen>;

  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
        <IconButton onPress={() => router.back()} icon={isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="title2">{language === "ar" ? "تفاصيل التمرينة" : "Workout details"}</AppText>
          <AppText variant="small" color="muted">{formatShortDate(session.scheduledDate, language)}</AppText>
        </View>
      </View>

      <Card style={{ gap: spacing.lg, backgroundColor: colors.primarySofter, borderColor: colors.primarySoft }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 62, height: 62, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><CalendarDays size={29} color={colors.primary} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="title3">{formatShortDate(session.scheduledDate, language)}</AppText><AppText color="muted">{session.exercises.length} {t("common.exercises")}</AppText></View>
        </View>
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm }}>
          {[
            { icon: Layers3, value: summary.sets, label: t("common.sets") },
            { icon: TimerReset, value: summary.minutes, label: t("common.minutes") },
            { icon: Dumbbell, value: Math.round(fromKilograms(summary.volume, weightUnit) ?? 0).toLocaleString(), label: `${weightUnit} ${language === "ar" ? "فوليوم" : "volume"}` },
          ].map(({ icon: Icon, value, label }) => (
            <View key={label} style={{ flexGrow: 1, flexBasis: 90, backgroundColor: colors.surface, borderRadius: 16, padding: 12, gap: 4 }}>
              <Icon size={18} color={colors.primary} /><AppText variant="bodyStrong">{value}</AppText><AppText variant="caption" color="muted">{label}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        {session.exercises.map((exercise, exerciseIndex) => {
          const completed = exercise.sets.filter((set) => set.isCompleted);
          return (
            <Card key={exercise.id} elevated={false} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><AppText variant="bodyStrong" color="primary">{exerciseIndex + 1}</AppText></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong" numberOfLines={2}>{exercise.exercise.name}</AppText><AppText variant="small" color="muted">{completed.length} {t("common.sets")}</AppText></View>
              </View>
              {completed.length ? (
                <View style={{ gap: 8 }}>
                  {completed.map((set) => (
                    <View key={set.id} style={{ gap: 5, backgroundColor: colors.surfaceMuted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.md, minHeight: 30 }}>
                        <AppText variant="smallBold" color="muted">{language === "ar" ? `سِت ${set.setNumber}` : `Set ${set.setNumber}`}</AppText>
                        <AppText variant="bodyStrong">{formatWeight(set.weightKg, weightUnit)} × {set.reps ?? 0}</AppText>
                      </View>
                      {set.notes ? <AppText variant="caption" color="muted">📝 {set.notes}</AppText> : null}
                    </View>
                  ))}
                </View>
              ) : <AppText variant="small" color="muted">{language === "ar" ? "مفيش سِتات مكتملة." : "No completed sets."}</AppText>}
              {exercise.notes ? <AppText variant="small" color="muted">{exercise.notes}</AppText> : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
