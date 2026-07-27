import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import { PhotoHero } from "@/components/brand/photo-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import { ActiveWorkoutConflictError, fetchActiveWorkout, fetchDailyConsistencyStreak, fetchWorkoutHistory, startWorkout } from "@/features/workouts/workout-service";
import { workoutVisual } from "@/lib/brand/workout-visuals";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, todayISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 5, padding: 12, borderRadius: 18, backgroundColor: colors.surfaceGlass, borderWidth: 1, borderColor: colors.glassBorder }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{icon}<AppText variant="caption" color="muted" numberOfLines={1}>{label}</AppText></View>
      <AppText variant="metric" numeric>{value}</AppText>
    </View>
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
    const results = await Promise.allSettled([
      fetchEffectiveWeekSchedule(user.id),
      fetchActiveWorkout(user.id),
      fetchWorkoutHistory(user.id, 80),
      fetchDailyConsistencyStreak(user.id),
    ]);
    const [week, activeSession, recent, remoteStreak] = results;
    if (week.status === "fulfilled") setSchedule(week.value);
    if (activeSession.status === "fulfilled") setActive(activeSession.value);
    if (recent.status === "fulfilled") setHistory(recent.value);
    if (remoteStreak.status === "fulfilled") setStreak(remoteStreak.value);
    if (week.status === "rejected" && schedule.length === 0) setError(friendlyError(week.reason));
    setLoading(false);
    setRefreshing(false);
  }, [schedule.length, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const today = useMemo(() => schedule.find((day) => day.scheduleDate === todayISODateOnly()) ?? null, [schedule]);
  const rest = today?.workoutType === "rest";
  const activeMatchesToday = Boolean(active && today && active.scheduledDate === today.scheduleDate && active.splitDayId === today.sourceSplitDayId);
  const activeCompletedSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0) ?? 0;
  const activeTotalSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
  const weekDates = new Set(schedule.map((day) => day.scheduleDate));
  const weekHistory = history.filter((session) => weekDates.has(session.scheduledDate));
  const plannedDays = schedule.filter((day) => day.workoutType !== "rest").length;
  const weeklyPercent = Math.min(100, Math.round((weekHistory.length / Math.max(1, plannedDays)) * 100));
  const todaySets = today?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0;
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  async function begin(replaceExisting = false) {
    if (!user || !membership || !today || rest || !today.sourceSplitDayId) return;
    setStarting(true);
    try {
      const session = await startWorkout({ userId: user.id, groupId: membership.group.id, splitDayId: today.sourceSplitDayId, exercises: today.exercises, scheduledDate: today.scheduleDate, replaceExisting });
      router.push({ pathname: "/workout/[sessionId]", params: { sessionId: session.id, prepare: "1" } });
    } catch (caught) {
      if (caught instanceof ActiveWorkoutConflictError) setConflict(caught.activeSession);
      else setError(friendlyError(caught));
    } finally { setStarting(false); }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const title = active
    ? (language === "ar" ? "كمّل من مكانك" : "Continue where you left off")
    : rest
      ? (language === "ar" ? "استشفاء النهارده" : "Recovery today")
      : today?.displayName ?? (language === "ar" ? "جهّز أول أسبوع" : "Set up your first week");

  const meta = active
    ? `${formatShortDate(active.scheduledDate, language)} · ${activeCompletedSets}/${activeTotalSets} ${t("common.sets")}`
    : rest
      ? (language === "ar" ? "الراحة جزء من الخطة. ارجع أقوى بكرة." : "Recovery is part of the plan. Come back stronger.")
      : today
        ? `${today.exercises.length} ${t("common.exercises")} · ${todaySets} ${t("common.sets")}`
        : (language === "ar" ? "اختار تقسيمة وابدأ أول تمرينة." : "Choose a split and start training.");

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader title={language === "ar" ? `أهلاً، ${profile?.displayName || "بطل"}` : `Hi, ${profile?.displayName || "Athlete"}`} subtitle={language === "ar" ? "جاهز للرقم اللي بعده؟" : "Ready to move the next number?"} />

      <PhotoHero
        source={workoutVisual(today?.workoutType)}
        height={268}
        topRight={<View style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(9,10,13,0.76)", borderWidth: 1, borderColor: colors.borderStrong }}><AppText variant="caption" color="primary">{language === "ar" ? "النهارده" : "TODAY"}</AppText></View>}
      >
        <View style={{ gap: 10 }}>
          <AppText variant="hero" style={{ color: colors.textOnDark }} numberOfLines={2}>{title}</AppText>
          <AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{meta}</AppText>
          {active ? <ProgressBar value={(activeCompletedSets / Math.max(1, activeTotalSets)) * 100} /> : null}
          {active ? (
            <Button icon={<RotateCcw color={colors.primaryInk} size={20} />} onPress={() => router.push(`/workout/${active.id}`)}>{language === "ar" ? "كمّل من مكانك" : "Continue workout"}</Button>
          ) : rest ? (
            <Button variant="dark" icon={<CalendarDays color={colors.primary} size={19} />} onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "راجع الأسبوع" : "Review your week"}</Button>
          ) : today?.sourceSplitDayId ? (
            <Button loading={starting} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={19} />} onPress={() => void begin()}>{language === "ar" ? "ابدأ التمرين" : "Start workout"}</Button>
          ) : (
            <Button onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "اختار جدول" : "Choose a plan"}</Button>
          )}
          {active && !activeMatchesToday && today && !rest ? <Pressable onPress={() => void begin()} style={({ pressed }) => ({ alignSelf: "center", opacity: pressed ? 0.6 : 1 })}><AppText variant="smallBold" color="primary">{language === "ar" ? "ابدأ تمرينة النهارده بدل الحالية" : "Start today instead"}</AppText></Pressable> : null}
        </View>
      </PhotoHero>

      <View style={{ flexDirection: rowDirection, gap: 10 }}>
        <Metric icon={<Dumbbell color={colors.primary} size={16} />} value={String(weekHistory.length)} label={language === "ar" ? "تمارين" : "Workouts"} />
        <Metric icon={<Flame color={colors.warning} size={16} />} value={String(streak)} label={language === "ar" ? "ستريك" : "Streak"} />
        <Metric icon={<TrendingUp color={colors.success} size={16} />} value={`${weeklyPercent}%`} label={language === "ar" ? "التزام" : "Adherence"} />
      </View>

      <Card variant="glass" style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <View><AppText variant="title3">{language === "ar" ? "أسبوعك" : "Your week"}</AppText><AppText variant="small" color="muted">{language === "ar" ? `${weekHistory.length} من ${plannedDays || 0} أيام مخططة` : `${weekHistory.length} of ${plannedDays || 0} planned days`}</AppText></View>
          <Pressable onPress={() => router.push("/(tabs)/progress")} style={({ pressed }) => ({ flexDirection: rowDirection, alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 })}><AppText variant="smallBold" color="primary">{language === "ar" ? "التفاصيل" : "Details"}</AppText><Arrow size={17} color={colors.primary} /></Pressable>
        </View>
        <WeekStrip schedule={schedule} sessions={weekHistory} />
      </Card>

      <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
        <Card variant="glass" elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><Layers3 color={colors.primaryStrong} size={22} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{language === "ar" ? "جدولك" : "Your plan"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "الأيام والتمارين والعدات" : "Days, exercises, and rep targets"}</AppText></View>
          <Arrow color={colors.textFaint} size={19} />
        </Card>
      </Pressable>

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}

      <ActionSheet visible={Boolean(conflict)} title={language === "ar" ? "عندك تمرينة مفتوحة" : "Workout already open"} description={conflict ? `${formatShortDate(conflict.scheduledDate, language)} · ${conflict.exercises.length} ${t("common.exercises")}` : undefined} onClose={() => setConflict(null)}>
        {conflict ? <Button onPress={() => { const id = conflict.id; setConflict(null); router.push(`/workout/${id}`); }}>{language === "ar" ? "كمّلها" : "Continue it"}</Button> : null}
        <Button variant="secondary" loading={starting} onPress={() => { setConflict(null); void begin(true); }}>{language === "ar" ? "الغيها وابدأ النهارده" : "Cancel it and start today"}</Button>
      </ActionSheet>
    </Screen>
  );
}
