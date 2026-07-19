import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, MoonStar, Play, RotateCcw, Sparkles } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActionSheet } from "@/components/ui/action-sheet";
import { AppToast } from "@/components/ui/app-toast";
import { WeekStrip } from "@/components/home/week-strip";
import { StatGrid } from "@/components/home/stat-grid";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import { ActiveWorkoutConflictError, fetchActiveWorkout, fetchDailyConsistencyStreak, fetchWorkoutHistory, startWorkout } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, toISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

export default function HomeScreen() {
  const { t, language, rowDirection, isRTL } = useTranslation();
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
  const [conflict, setConflict] = useState<WorkoutSessionWithDetails | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [week, activeSession, history, remoteStreak] = await Promise.all([
        fetchEffectiveWeekSchedule(user.id),
        fetchActiveWorkout(user.id),
        fetchWorkoutHistory(user.id, 30),
        fetchDailyConsistencyStreak().catch(() => null),
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
      setStats({ sessions: history.length, streak: remoteStreak ?? streak, volume });
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const today = useMemo(() => schedule.find((day) => day.scheduleDate === toISODateOnly()) ?? null, [schedule]);
  const rest = today?.workoutType === "rest";
  const activeMatchesToday = Boolean(active && today && active.scheduledDate === today.scheduleDate && active.splitDayId === today.sourceSplitDayId);
  const completedSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0) ?? 0;
  const totalSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  async function begin(replaceExisting = false) {
    if (!user || !membership || !today || rest || !today.sourceSplitDayId) return;
    setStarting(true);
    try {
      const session = await startWorkout({ userId: user.id, groupId: membership.group.id, splitDayId: today.sourceSplitDayId, exercises: today.exercises, scheduledDate: today.scheduleDate, replaceExisting });
      router.push({ pathname: "/workout/[sessionId]", params: { sessionId: session.id, prepare: "1" } });
    } catch (caught) {
      if (caught instanceof ActiveWorkoutConflictError) {
        setConflict(caught.activeSession);
        return;
      }
      setToast(friendlyError(caught));
      setTimeout(() => setToast(null), 3000);
    } finally { setStarting(false); }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("home.hello", { name: profile?.displayName || "Crew" })} subtitle={t("home.ready")} />

      <Card style={{ gap: spacing.lg, backgroundColor: rest ? colors.surface : colors.primarySofter, borderColor: rest ? colors.border : colors.primarySoft }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: rest ? colors.warningSoft : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            {rest ? <MoonStar color={colors.warning} size={30} /> : <Dumbbell color={colors.primary} size={30} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><Sparkles size={15} color={colors.primary} /><AppText variant="caption" color="primary">{t("home.todayWorkout")}</AppText></View>
            <AppText variant="title2" numberOfLines={2}>{active ? (activeMatchesToday ? t("home.continue") : (language === "ar" ? "كمّل تمرينتك المفتوحة" : "Finish your open workout")) : rest ? t("home.recovery") : today?.displayName ?? t("home.setupSplit")}</AppText>
            <AppText color="muted" numberOfLines={2}>{active ? `${formatShortDate(active.scheduledDate, language)} · ${completedSets}/${totalSets} ${t("common.sets")}` : rest ? t("home.recoveryDesc") : today ? `${today.exercises.length} ${t("common.exercises")} · ${today.focusLabel || today.displayName}` : t("home.setupSplit")}</AppText>
          </View>
        </View>
        {active ? <ProgressBar value={(completedSets / Math.max(1, totalSets)) * 100} /> : null}
        {active ? (
          <View style={{ gap: spacing.sm }}>
            <Button icon={<RotateCcw color={colors.white} size={20} />} onPress={() => router.push(`/workout/${active.id}`)}>{t("home.continue")}</Button>
            {!activeMatchesToday && today && !rest ? <Button variant="secondary" loading={starting} onPress={() => void begin()}>{language === "ar" ? "ابدأ تمرينة النهارده" : "Start today's workout"}</Button> : null}
          </View>
        ) : rest ? (
          <Button variant="secondary" icon={<CalendarDays color={colors.primary} size={19} />} onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "شوف باقي الأسبوع" : "View the rest of the week"}</Button>
        ) : today?.sourceSplitDayId ? (
          <Button loading={starting} icon={<Play fill={colors.white} color={colors.white} size={20} />} onPress={() => void begin()}>{t("home.start")}</Button>
        ) : (
          <Button onPress={() => router.push("/(tabs)/split")}>{t("home.setupSplit")}</Button>
        )}
      </Card>

      <SectionHeader title={t("home.progress")} />
      <StatGrid sessions={stats.sessions} streak={stats.streak} volume={stats.volume} />

      <SectionHeader title={t("home.weekPlan")} action={
        <Pressable onPress={() => router.push("/(tabs)/split")} style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}><AppText variant="smallBold" color="primary">{language === "ar" ? "عدّل" : "Edit"}</AppText><Arrow size={16} color={colors.primary} /></Pressable>
      } />
      <WeekStrip days={schedule} />

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}

      <ActionSheet
        visible={Boolean(conflict)}
        title={language === "ar" ? "في تمرينة قديمة شغالة" : "Another workout is active"}
        description={conflict ? (language === "ar" ? `التمرينة المفتوحة بتاريخ ${formatShortDate(conflict.scheduledDate, language)}. اختار تكملها أو تبدأ تمرينة النهارده.` : `The open workout is dated ${formatShortDate(conflict.scheduledDate, language)}. Continue it or start today's workout.`) : undefined}
        onClose={() => setConflict(null)}
      >
        <Button onPress={() => { if (!conflict) return; const id = conflict.id; setConflict(null); router.push(`/workout/${id}`); }}>{language === "ar" ? "كمّل القديمة" : "Continue old workout"}</Button>
        <Button variant="secondary" loading={starting} onPress={() => { setConflict(null); void begin(true); }}>{language === "ar" ? "ابدأ تمرينة النهارده" : "Start today's workout"}</Button>
      </ActionSheet>
      <AppToast visible={Boolean(toast)} message={toast ?? ""} tone="danger" />
    </Screen>
  );
}
