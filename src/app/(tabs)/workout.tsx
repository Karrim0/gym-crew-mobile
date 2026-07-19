import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ChevronRight, Dumbbell, PlayCircle, TimerReset } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchActiveWorkout, fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { fromKilograms } from "@/lib/utils/weight";
import type { WorkoutSessionWithDetails } from "@/types";

export default function WorkoutTab() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { t, language, rowDirection, isRTL } = useTranslation();
  const { colors } = useAppTheme();
  const [active, setActive] = useState<WorkoutSessionWithDetails | null>(null);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [current, recent] = await Promise.all([fetchActiveWorkout(user.id), fetchWorkoutHistory(user.id, 20)]);
      setActive(current); setHistory(recent);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeStats = useMemo(() => {
    if (!active) return { completed: 0, total: 0, percent: 0 };
    const completed = active.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
    const total = active.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    return { completed, total, percent: (completed / Math.max(1, total)) * 100 };
  }, [active]);
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length && !active) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("workout.title")} subtitle={language === "ar" ? "كل سِت بتتحفظ على الجهاز فورًا، حتى لو النت قطع." : "Every set is saved on-device immediately, even offline."} />
      {active ? (
        <Card variant="dark" style={{ gap: spacing.lg, padding: spacing.xl, borderRadius: 30 }}>
          <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -75, bottom: -105 }} />
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 62, height: 62, borderRadius: 21, backgroundColor: colors.heroMuted, alignItems: "center", justifyContent: "center" }}><PlayCircle color={colors.primary} size={31} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><AppText variant="title2" style={{ color: colors.textOnDark }}>{language === "ar" ? "كمّل من مكانك" : "Pick up where you left off"}</AppText><AppText style={{ color: colors.textMuted }}>{formatShortDate(active.scheduledDate, language)} · {active.exercises.length} {t("common.exercises")}</AppText></View>
            <AppText variant="title2" color="primary">{Math.round(activeStats.percent)}%</AppText>
          </View>
          <ProgressBar value={activeStats.percent} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{activeStats.completed} / {activeStats.total} {t("common.sets")}</AppText>
          <Button onPress={() => router.push(`/workout/${active.id}`)} icon={<PlayCircle color={colors.primaryInk} size={20} />}>{language === "ar" ? "افتح الجيم مود" : "Open gym mode"}</Button>
        </Card>
      ) : (
        <Card style={{ minHeight: 290, justifyContent: "center" }}><EmptyState title={t("workout.noWorkout")} description={t("workout.noWorkoutDesc")} actionLabel={t("tabs.home")} onAction={() => router.push("/(tabs)/home")} /></Card>
      )}

      <SectionHeader title={language === "ar" ? "آخر التمرينات" : "Recent workouts"} />
      <View style={{ gap: spacing.sm }}>
        {history.map((session) => {
          const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
          const volume = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
          const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
              <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><CalendarClock color={colors.primary} size={23} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}><View style={{ flexDirection: rowDirection, gap: 4, alignItems: "center" }}><Dumbbell size={14} color={colors.textMuted} /><AppText variant="caption" color="muted">{sets} {t("common.sets")}</AppText></View><View style={{ flexDirection: rowDirection, gap: 4, alignItems: "center" }}><TimerReset size={14} color={colors.textMuted} /><AppText variant="caption" color="muted">{minutes} {t("common.minutes")}</AppText></View></View><AppText variant="caption" color="faint">{Math.round(fromKilograms(volume, weightUnit) ?? 0).toLocaleString()} {weightUnit} {language === "ar" ? "فوليوم" : "volume"}</AppText></View>
                <Arrow color={colors.textFaint} size={19} />
              </Card>
            </Pressable>
          );
        })}
        {!history.length ? <Card><AppText color="muted">{language === "ar" ? "أول تمرينة هتظهر هنا." : "Your first completed workout will appear here."}</AppText></Card> : null}
      </View>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
