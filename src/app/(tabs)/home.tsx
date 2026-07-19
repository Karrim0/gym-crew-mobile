import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
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
import { formatShortDate, todayISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { fromKilograms } from "@/lib/utils/weight";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <Card elevated={false} style={{ flex: 1, minWidth: 0, padding: 13, gap: 6 }}>
      <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <AppText variant="title3">{value}</AppText>
      <AppText variant="caption" color="muted" numberOfLines={1}>{label}</AppText>
    </Card>
  );
}

export default function HomeScreen() {
  const { t, language, rowDirection, isRTL } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const weightUnit = useSettingsStore((state) => state.weightUnit);
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
  const weekSets = weekHistory.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
  const weekVolume = weekSets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const plannedDays = schedule.filter((day) => day.workoutType !== "rest").length;
  const weeklyPercent = Math.min(100, Math.round((weekHistory.length / Math.max(1, plannedDays)) * 100));
  const todaySets = today?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0;
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
      if (caught instanceof ActiveWorkoutConflictError) setConflict(caught.activeSession);
      else setError(friendlyError(caught));
    } finally { setStarting(false); }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const heroTitle = active
    ? (activeMatchesToday ? (language === "ar" ? "كمّل اللي بدأته" : "Keep it moving") : (language === "ar" ? "تمرينة مفتوحة" : "Workout open"))
    : rest
      ? (language === "ar" ? "يوم استشفاء" : "Recovery day")
      : today?.displayName ?? (language === "ar" ? "اختار جدولك" : "Choose your plan");

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={language === "ar" ? `أهلاً، ${profile?.displayName || "كرو"}` : `Hi, ${profile?.displayName || "Crew"}`} subtitle={language === "ar" ? "كل كليك يقربك من هدفك." : "Every set moves you forward."} />

      <Card variant="dark" style={{ gap: spacing.lg, padding: spacing.xl, borderRadius: 30, borderColor: colors.borderStrong }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: colors.glow, end: -100, bottom: -120 }} />
        <View pointerEvents="none" style={{ position: "absolute", width: 92, height: 92, borderRadius: 46, backgroundColor: colors.primarySofter, end: 28, top: 24, opacity: 0.16 }} />

        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 7 }}><Sparkles color={colors.primary} size={17} /><AppText variant="overline" color="primary">{language === "ar" ? "تمرين النهارده" : "TODAY'S WORKOUT"}</AppText></View>
          <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.heroMuted, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 })}><CalendarDays size={19} color={colors.textOnDark} /></Pressable>
        </View>

        <View style={{ maxWidth: "82%", gap: 7 }}>
          <AppText variant="hero" style={{ color: colors.textOnDark }} numberOfLines={2}>{heroTitle}</AppText>
          <AppText color="muted" numberOfLines={2}>
            {active
              ? `${formatShortDate(active.scheduledDate, language)} · ${activeCompletedSets}/${activeTotalSets} ${t("common.sets")}`
              : rest
                ? (language === "ar" ? "استشفاء كويس النهارده يعني أداء أقوى بكرة." : "Recover today. Perform better tomorrow.")
                : today
                  ? `${today.exercises.length} ${t("common.exercises")} · ${todaySets} ${t("common.sets")}`
                  : (language === "ar" ? "اختار تقسيمة مناسبة وابدأ." : "Pick a split and start.")}
          </AppText>
        </View>

        {active ? <ProgressBar value={(activeCompletedSets / Math.max(1, activeTotalSets)) * 100} /> : null}

        {active ? (
          <View style={{ gap: 9 }}>
            <Button icon={<RotateCcw color={colors.primaryInk} size={20} />} onPress={() => router.push(`/workout/${active.id}`)}>{language === "ar" ? "كمّل التمرينة" : "Continue workout"}</Button>
            {!activeMatchesToday && today && !rest ? <Button variant="dark" loading={starting} onPress={() => void begin()}>{language === "ar" ? "ابدأ تمرينة النهارده" : "Start today"}</Button> : null}
          </View>
        ) : rest ? (
          <Button variant="dark" icon={<CalendarDays color={colors.primary} size={19} />} onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "شوف الأسبوع" : "View week"}</Button>
        ) : today?.sourceSplitDayId ? (
          <Button loading={starting} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={19} />} onPress={() => void begin()}>{language === "ar" ? "ابدأ التمرين" : "Start workout"}</Button>
        ) : (
          <Button onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "اختار جدول" : "Choose a plan"}</Button>
        )}
      </Card>

      <View style={{ flexDirection: rowDirection, gap: 10 }}>
        <Metric icon={<Dumbbell color={colors.primaryStrong} size={19} />} value={String(weekHistory.length)} label={language === "ar" ? "تمارين الأسبوع" : "This week"} />
        <Metric icon={<Flame color={colors.warning} size={19} />} value={String(streak)} label={language === "ar" ? "استمرارية" : "Day streak"} />
        <Metric icon={<TrendingUp color={colors.success} size={19} />} value={`${weeklyPercent}%`} label={language === "ar" ? "التزام" : "Adherence"} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <View><AppText variant="title3">{language === "ar" ? "أسبوعك" : "Your week"}</AppText><AppText variant="small" color="muted">{weekVolume ? `${Math.round(fromKilograms(weekVolume, weightUnit) ?? 0).toLocaleString()} ${weightUnit} ${language === "ar" ? "فوليوم" : "volume"}` : (language === "ar" ? "ابدأ أول تمرينة" : "Log your first workout")}</AppText></View>
          <Pressable onPress={() => router.push("/(tabs)/progress")} style={({ pressed }) => ({ flexDirection: rowDirection, alignItems: "center", gap: 4, opacity: pressed ? 0.65 : 1 })}><AppText variant="smallBold" color="primary">{language === "ar" ? "التقدم" : "Progress"}</AppText><Arrow size={17} color={colors.primaryStrong} /></Pressable>
        </View>
        <WeekStrip schedule={schedule} sessions={weekHistory} />
      </Card>

      <View style={{ flexDirection: rowDirection, gap: 10 }}>
        <Pressable onPress={() => router.push("/(tabs)/workout")} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.76 : 1 })}>
          <Card elevated={false} style={{ minHeight: 102, gap: 9 }}><View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><History color={colors.primaryStrong} size={20} /></View><AppText variant="smallBold">{language === "ar" ? "سجل التمرين" : "Workout log"}</AppText></Card>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.76 : 1 })}>
          <Card elevated={false} style={{ minHeight: 102, gap: 9 }}><View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><Layers3 color={colors.primaryStrong} size={20} /></View><AppText variant="smallBold">{language === "ar" ? "جدولك" : "Your split"}</AppText></Card>
        </Pressable>
      </View>

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}

      <ActionSheet visible={Boolean(conflict)} title={language === "ar" ? "عندك تمرينة مفتوحة" : "Workout already open"} description={conflict ? `${formatShortDate(conflict.scheduledDate, language)} · ${conflict.exercises.length} ${t("common.exercises")}` : undefined} onClose={() => setConflict(null)}>
        {conflict ? <Button onPress={() => { const id = conflict.id; setConflict(null); router.push(`/workout/${id}`); }}>{language === "ar" ? "كمّلها" : "Continue it"}</Button> : null}
        <Button variant="secondary" loading={starting} onPress={() => { setConflict(null); void begin(true); }}>{language === "ar" ? "الغيها وابدأ النهارده" : "Cancel it and start today"}</Button>
      </ActionSheet>
    </Screen>
  );
}
