import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Dumbbell, MoonStar, Play, RotateCcw } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { WeekStrip } from "@/components/home/week-strip";
import { StatGrid } from "@/components/home/stat-grid";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import { fetchActiveWorkout, fetchWorkoutHistory, startWorkout } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { toISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

export default function HomeScreen() {
  const { t, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const membership = useSessionStore((state) => state.membership);
  const [schedule, setSchedule] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [active, setActive] = useState<WorkoutSessionWithDetails | null>(null);
  const [stats, setStats] = useState({ sessions: 0, streak: 0, volume: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [week, activeSession, history] = await Promise.all([
        fetchEffectiveWeekSchedule(user.id),
        fetchActiveWorkout(user.id),
        fetchWorkoutHistory(user.id, 30),
      ]);
      setSchedule(week);
      setActive(activeSession);
      const completedSets = history.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
      const volume = completedSets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
      const recentDates = new Set(history.map((session) => session.scheduledDate));
      let streak = 0;
      for (let cursor = new Date(); streak < 365; cursor.setDate(cursor.getDate() - 1)) {
        const iso = toISODateOnly(cursor);
        const scheduled = week.find((day) => day.scheduleDate === iso);
        if (scheduled?.workoutType === "rest" || recentDates.has(iso)) streak += 1;
        else if (cursor.toDateString() === new Date().toDateString()) continue;
        else break;
      }
      setStats({ sessions: history.length, streak, volume });
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const today = schedule.find((day) => day.scheduleDate === toISODateOnly()) ?? null;
  const rest = today?.workoutType === "rest";

  async function begin() {
    if (!user || !membership || !today || rest || !today.sourceSplitDayId) return;
    setStarting(true);
    try {
      const session = await startWorkout({
        userId: user.id,
        groupId: membership.group.id,
        splitDayId: today.sourceSplitDayId,
        exercises: today.exercises,
        scheduledDate: today.scheduleDate,
      });
      router.push(`/workout/${session.id}`);
    } catch (caught) {
      Alert.alert(t("common.error"), friendlyError(caught));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("home.hello", { name: profile?.displayName || "Crew" })} subtitle={t("home.ready")} />

      <SectionHeader title={t("home.todayWorkout")} />
      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: rest ? colors.surfaceMuted : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            {rest ? <MoonStar color={colors.warning} size={28} /> : <Dumbbell color={colors.primary} size={28} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="title3">{active ? t("home.continue") : rest ? t("home.recovery") : today?.displayName ?? t("home.setupSplit")}</AppText>
            <AppText color="muted">
              {active
                ? `${active.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0)} / ${active.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} ${t("common.sets")}`
                : rest
                  ? t("home.recoveryDesc")
                  : today
                    ? `${today.exercises.length} ${t("common.exercises")}`
                    : t("home.setupSplit")}
            </AppText>
          </View>
        </View>
        {active ? (
          <Button icon={<RotateCcw color={colors.white} size={20} />} onPress={() => router.push(`/workout/${active.id}`)}>{t("home.continue")}</Button>
        ) : today && !rest && today.exercises.length ? (
          <Button loading={starting} icon={<Play color={colors.white} size={20} />} onPress={() => void begin()}>{t("home.start")}</Button>
        ) : !today ? (
          <Button onPress={() => router.push("/(tabs)/split")}>{t("home.setupSplit")}</Button>
        ) : null}
      </Card>

      <SectionHeader title={t("home.weekPlan")} />
      {schedule.length ? <WeekStrip days={schedule} /> : <Card><AppText color="muted">{t("home.setupSplit")}</AppText></Card>}

      <SectionHeader title={t("home.progress")} />
      <StatGrid {...stats} />
    </Screen>
  );
}
