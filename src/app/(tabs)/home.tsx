import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers3,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActionSheet } from "@/components/ui/action-sheet";
import { WeekStrip } from "@/components/home/week-strip";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import { ActiveWorkoutConflictError, fetchActiveWorkout, fetchDailyConsistencyStreak, fetchWorkoutHistory, startWorkout } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, toISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <Card elevated={false} style={{ flex: 1, minWidth: 0, padding: spacing.md, alignItems: "center", gap: 5 }}>
      <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <AppText variant="title3" align="center">{value}</AppText>
      <AppText variant="caption" color="muted" align="center" numberOfLines={1}>{label}</AppText>
    </Card>
  );
}

export default function HomeScreen() {
  const { t, language, rowDirection, isRTL } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const membership = useSessionStore((state) => state.membership);
  const [schedule, setSchedule] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [active, setActive] = useState<WorkoutSessionWithDetails | null>(null);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<WorkoutSessionWithDetails | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [week, activeSession, recent, remoteStreak] = await Promise.all([
        fetchEffectiveWeekSchedule(user.id),
        fetchActiveWorkout(user.id),
        fetchWorkoutHistory(user.id, 60),
        fetchDailyConsistencyStreak(user.id).catch(() => 0),
      ]);
      setSchedule(week);
      setActive(activeSession);
      setHistory(recent);
      setStreak(remoteStreak);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const today = useMemo(() => schedule.find((day) => day.scheduleDate === toISODateOnly()) ?? null, [schedule]);
  const rest = today?.workoutType === "rest";
  const activeMatchesToday = Boolean(active && today && active.scheduledDate === today.scheduleDate && active.splitDayId === today.sourceSplitDayId);
  const activeCompletedSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0) ?? 0;
  const activeTotalSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
  const weekDates = new Set(schedule.map((day) => day.scheduleDate));
  const weekHistory = history.filter((session) => weekDates.has(session.scheduledDate));
  const weekSets = weekHistory.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
  const weekVolume = weekSets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const plannedDays = schedule.filter((day) => day.workoutType !== "rest").length;
  const weeklyPercent = Math.min(100, Math.round((weekHistory.length / Math.max(1, plannedDays)) * 100));
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  async function begin(replaceExisting = false) {
    if (!user || !membership || !today || rest || !today.sourceSplitDayId) return;
    setStarting(true);
    try {
      const session = await startWorkout({
        userId: user.id,
        groupId: membership.group.id,
        splitDayId: today.sourceSplitDayId,
        exercises: today.exercises,
        scheduledDate: today.scheduleDate,
        replaceExisting,
      });
      router.push({ pathname: "/workout/[sessionId]", params: { sessionId: session.id, prepare: "1" } });
    } catch (caught) {
      if (caught instanceof ActiveWorkoutConflictError) {
        setConflict(caught.activeSession);
        return;
      }
      setError(friendlyError(caught));
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const heroTitle = active
    ? (activeMatchesToday ? (language === "ar" ? "كمّل تمرينتك" : "Continue workout") : (language === "ar" ? "عندك تمرينة مفتوحة" : "Workout in progress"))
    : rest
      ? (language === "ar" ? "يوم راحة" : "Recovery day")
      : today?.displayName ?? (language === "ar" ? "ظبط جدولك" : "Set up your plan");

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader
        title={language === "ar" ? `أهلاً، ${profile?.displayName || "كرو"}` : `Hi, ${profile?.displayName || "Crew"}`}
        subtitle={language === "ar" ? "جاهز لتمرينة النهارده؟" : "Ready for today?"}
      />

      <Card style={{ gap: spacing.lg, borderColor: active || !rest ? colors.primarySoft : colors.border, backgroundColor: colors.surface, padding: spacing.xl }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.primarySofter, end: -55, bottom: -78 }} />
        <View pointerEvents="none" style={{ position: "absolute", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, end: 35, top: 26, opacity: 0.65 }} />

        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 7 }}>
            <Sparkles color={colors.primaryStrong} size={17} />
            <AppText variant="smallBold" color="primary">{language === "ar" ? "تمرين اليوم" : "Today"}</AppText>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, padding: 6 })}>
            <CalendarDays size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ maxWidth: "74%", gap: 6 }}>
          <AppText variant="title1" numberOfLines={2}>{heroTitle}</AppText>
          <AppText color="muted" numberOfLines={2}>
            {active
              ? `${formatShortDate(active.scheduledDate, language)} · ${activeCompletedSets}/${activeTotalSets} ${t("common.sets")}`
              : rest
                ? (language === "ar" ? "خد وقتك وارجع أقوى." : "Recover and come back stronger.")
                : today
                  ? `${today.exercises.length} ${t("common.exercises")} · ${today.focusLabel || today.displayName}`
                  : (language === "ar" ? "اختار جدول مناسب وابدأ." : "Choose a plan to get started.")}
          </AppText>
        </View>

        {active ? <ProgressBar value={(activeCompletedSets / Math.max(1, activeTotalSets)) * 100} /> : null}

        {active ? (
          <View style={{ gap: spacing.sm }}>
            <Button icon={<RotateCcw color={colors.black} size={20} />} onPress={() => router.push(`/workout/${active.id}`)}>{language === "ar" ? "كمّل التمرينة" : "Continue"}</Button>
            {!activeMatchesToday && today && !rest ? <Button variant="secondary" loading={starting} onPress={() => void begin()}>{language === "ar" ? "ابدأ تمرينة النهارده" : "Start today"}</Button> : null}
          </View>
        ) : rest ? (
          <Button variant="secondary" icon={<CalendarDays color={colors.primaryStrong} size={19} />} onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "شوف الأسبوع" : "View week"}</Button>
        ) : today?.sourceSplitDayId ? (
          <Button loading={starting} icon={<Play fill={colors.black} color={colors.black} size={19} />} onPress={() => void begin()}>{language === "ar" ? "ابدأ التمرين" : "Start workout"}</Button>
        ) : (
          <Button onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "اختار جدول" : "Choose a plan"}</Button>
        )}
      </Card>

      <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
        <MetricCard icon={<Dumbbell color={colors.primaryStrong} size={20} />} value={String(weekHistory.length)} label={language === "ar" ? "تمرينات الأسبوع" : "Workouts"} />
        <MetricCard icon={<Layers3 color={colors.primaryStrong} size={20} />} value={String(weekSets.length)} label={language === "ar" ? "سِتات" : "Sets"} />
        <MetricCard icon={<Flame color={colors.primaryStrong} size={20} />} value={String(streak)} label={language === "ar" ? "استمرارية" : "Streak"} />
      </View>

      <Card elevated={false} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <AppText variant="title3">{language === "ar" ? "تقدم الأسبوع" : "Weekly progress"}</AppText>
            <AppText variant="small" color="muted">{weekHistory.length} / {plannedDays} {language === "ar" ? "أيام تمرين" : "training days"}</AppText>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySofter, borderWidth: 7, borderColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="smallBold">{weeklyPercent}%</AppText>
          </View>
        </View>
        <ProgressBar value={weeklyPercent} />
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><TrendingUp size={16} color={colors.primaryStrong} /><AppText variant="caption" color="muted">{Math.round(weekVolume).toLocaleString()} {t("common.kg")} {language === "ar" ? "حجم تدريبي" : "volume"}</AppText></View>
          <Pressable onPress={() => router.push("/(tabs)/progress")} style={{ flexDirection: rowDirection, alignItems: "center", gap: 3 }}><AppText variant="smallBold" color="primary">{language === "ar" ? "التفاصيل" : "Details"}</AppText><Arrow size={16} color={colors.primaryStrong} /></Pressable>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="title3">{language === "ar" ? "الأسبوع" : "This week"}</AppText>
          <Pressable onPress={() => router.push("/(tabs)/split")} style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}><AppText variant="smallBold" color="primary">{language === "ar" ? "تعديل" : "Edit"}</AppText><Arrow size={16} color={colors.primaryStrong} /></Pressable>
        </View>
        <WeekStrip days={schedule} />
      </View>

      {error ? <AppText variant="caption" color="warning">{error}</AppText> : null}

      <ActionSheet
        visible={Boolean(conflict)}
        title={language === "ar" ? "في تمرينة مفتوحة" : "Workout already open"}
        description={conflict ? formatShortDate(conflict.scheduledDate, language) : undefined}
        onClose={() => setConflict(null)}
      >
        <Button onPress={() => { if (!conflict) return; const id = conflict.id; setConflict(null); router.push(`/workout/${id}`); }}>{language === "ar" ? "كمّلها" : "Continue it"}</Button>
        <Button variant="secondary" loading={starting} onPress={() => { setConflict(null); void begin(true); }}>{language === "ar" ? "ابدأ تمرينة النهارده" : "Start today instead"}</Button>
      </ActionSheet>
    </Screen>
  );
}
