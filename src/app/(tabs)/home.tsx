import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  RotateCcw,
  TrendingUp,
} from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActionSheet } from "@/components/ui/action-sheet";
import { WeekStrip } from "@/components/home/week-strip";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import {
  ActiveWorkoutConflictError,
  fetchActiveWorkout,
  fetchDailyConsistencyStreak,
  fetchWorkoutHistory,
  startWorkout,
} from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, todayISODateOnly } from "@/lib/utils/date";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <AppText variant="metric" numeric>{value}</AppText>
      <AppText variant="caption" color="muted" numberOfLines={1}>{label}</AppText>
    </View>
  );
}

function Shortcut({ icon, title, subtitle, onPress }: { icon: ReactNode; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { rowDirection, isRTL } = useTranslation();
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.68 : 1 })}>
      <Card variant="raised" elevated={false} style={{ minHeight: 128, padding: 14, gap: 12 }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
          <Arrow color={colors.textFaint} size={17} />
        </View>
        <View style={{ gap: 2 }}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" color="muted" numberOfLines={2}>{subtitle}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t, language, rowDirection } = useTranslation();
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
  const activeCompletedSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0) ?? 0;
  const activeTotalSets = active?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
  const activeCurrentExercise = active?.exercises.find((exercise) => exercise.sets.some((set) => !set.isCompleted))?.exercise.name ?? null;
  const weekDates = new Set(schedule.map((day) => day.scheduleDate));
  const weekHistory = history.filter((session) => weekDates.has(session.scheduledDate));
  const plannedDays = schedule.filter((day) => day.workoutType !== "rest").length;
  const weeklyPercent = Math.min(100, Math.round((weekHistory.length / Math.max(1, plannedDays)) * 100));
  const todaySets = today?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0;
  const latest = history[0] ?? null;

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
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader
        title={language === "ar" ? `أهلاً، ${profile?.displayName || "بطل"}` : `Hi, ${profile?.displayName || "Athlete"}`}
        subtitle={language === "ar" ? formatShortDate(todayISODateOnly(), language) : formatShortDate(todayISODateOnly(), language)}
      />

      {active ? (
        <Card variant="dark" style={{ gap: 18, padding: 18, borderColor: colors.borderStrong }}>
          <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -90, top: -100 }} />
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 7 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                <AppText variant="overline" color="primary">{language === "ar" ? "جلسة مفتوحة" : "ACTIVE SESSION"}</AppText>
              </View>
              <AppText variant="title1" style={{ color: colors.textOnDark }}>{language === "ar" ? "كمّل من مكانك" : "Continue where you left off"}</AppText>
              <AppText variant="small" style={{ color: colors.textOnDarkMuted }} numberOfLines={1}>
                {activeCurrentExercise ? `${language === "ar" ? "دلوقتي" : "Now"}: ${activeCurrentExercise}` : formatShortDate(active.scheduledDate, language)}
              </AppText>
            </View>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <RotateCcw color={colors.primaryInk} size={25} />
            </View>
          </View>
          <View style={{ gap: 7 }}>
            <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
              <AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{activeCompletedSets}/{activeTotalSets} {t("common.sets")}</AppText>
              <AppText variant="smallBold" numeric color="primary">{Math.round((activeCompletedSets / Math.max(1, activeTotalSets)) * 100)}%</AppText>
            </View>
            <ProgressBar value={(activeCompletedSets / Math.max(1, activeTotalSets)) * 100} />
          </View>
          <Button icon={<RotateCcw color={colors.primaryInk} size={19} />} onPress={() => router.push(`/workout/${active.id}`)}>
            {language === "ar" ? "كمّل التمرين" : "Resume workout"}
          </Button>
        </Card>
      ) : rest ? (
        <Card variant="dark" style={{ gap: 16, padding: 18, borderColor: colors.borderStrong }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 5 }}>
              <AppText variant="overline" color="primary">{language === "ar" ? "يوم راحة" : "RECOVERY DAY"}</AppText>
              <AppText variant="title1" style={{ color: colors.textOnDark }}>{language === "ar" ? "النهارده راحة" : "Recovery today"}</AppText>
              <AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{language === "ar" ? "راجع أسبوعك أو جهّز التمرينة الجاية." : "Review your week or prepare the next session."}</AppText>
            </View>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.heroMuted, alignItems: "center", justifyContent: "center" }}><Clock3 color={colors.primary} size={24} /></View>
          </View>
          <Button variant="dark" icon={<CalendarDays color={colors.primary} size={18} />} onPress={() => router.push("/(tabs)/split")}>
            {language === "ar" ? "راجع الخطة" : "Review plan"}
          </Button>
        </Card>
      ) : today?.sourceSplitDayId ? (
        <Card variant="dark" style={{ gap: 18, padding: 18, borderColor: colors.borderStrong }}>
          <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -90, bottom: -120 }} />
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <AppText variant="overline" color="primary">{language === "ar" ? "تمرين النهارده" : "TODAY'S WORKOUT"}</AppText>
              <AppText variant="title1" style={{ color: colors.textOnDark }} numberOfLines={2}>{today.displayName}</AppText>
              <AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{today.exercises.length} {t("common.exercises")} · {todaySets} {t("common.sets")}</AppText>
            </View>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Dumbbell color={colors.primaryInk} size={25} /></View>
          </View>
          {today.exercises.slice(0, 3).map((exercise, index) => (
            <View key={exercise.id} style={{ flexDirection: rowDirection, alignItems: "center", gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: colors.heroMuted, alignItems: "center", justifyContent: "center" }}><AppText variant="caption" color="primary" numeric>{index + 1}</AppText></View>
              <AppText variant="small" style={{ color: colors.textOnDark, flex: 1 }} numberOfLines={1}>{exercise.exercise.name}</AppText>
              <AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{exercise.targetSets} {t("common.sets")}</AppText>
            </View>
          ))}
          <View style={{ flexDirection: rowDirection, gap: 8 }}>
            <Button style={{ flex: 1 }} loading={starting} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={18} />} onPress={() => void begin()}>
              {language === "ar" ? "ابدأ التمرين" : "Start workout"}
            </Button>
            <Button compact variant="dark" onPress={() => router.push("/(tabs)/split")}>{language === "ar" ? "راجع" : "Review"}</Button>
          </View>
        </Card>
      ) : (
        <Card variant="raised" style={{ minHeight: 238, justifyContent: "center" }}>
          <EmptyState
            title={language === "ar" ? "ابدأ بخطة واضحة" : "Start with a clear plan"}
            description={language === "ar" ? "اختار خطة جاهزة أو اعمل جدولك من الصفر." : "Choose a preset or build your week from scratch."}
            actionLabel={language === "ar" ? "اختار خطة" : "Choose a plan"}
            onAction={() => router.push("/(tabs)/split")}
          />
        </Card>
      )}

      {schedule.length ? (
        <Card variant="raised" style={{ gap: 14, padding: 15 }}>
          <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
            <View><AppText variant="bodyStrong">{language === "ar" ? "الأسبوع الحالي" : "This week"}</AppText><AppText variant="caption" color="muted">{weekHistory.length}/{Math.max(1, plannedDays)} {language === "ar" ? "تمرينات مكتملة" : "workouts completed"}</AppText></View>
            <AppText variant="smallBold" numeric color="primary">{weeklyPercent}%</AppText>
          </View>
          <WeekStrip schedule={schedule} sessions={weekHistory} />
        </Card>
      ) : null}

      <SectionHeader title={language === "ar" ? "نظرة سريعة" : "Quick view"} />
      <Card variant="raised" style={{ flexDirection: rowDirection, gap: 12, padding: 14 }}>
        <Metric icon={<CheckCircle2 color={colors.primary} size={18} />} value={String(weekHistory.length)} label={language === "ar" ? "تمرينات الأسبوع" : "Weekly workouts"} />
        <View style={{ width: 1, backgroundColor: colors.separator }} />
        <Metric icon={<TrendingUp color={colors.primary} size={18} />} value={`${weeklyPercent}%`} label={language === "ar" ? "الالتزام" : "Adherence"} />
        <View style={{ width: 1, backgroundColor: colors.separator }} />
        <Metric icon={<Flame color={colors.primary} size={18} />} value={String(streak)} label={language === "ar" ? "أيام متتالية" : "Day streak"} />
      </Card>

      <View style={{ flexDirection: rowDirection, gap: 10 }}>
        <Shortcut icon={<CalendarDays color={colors.primary} size={20} />} title={language === "ar" ? "الخطة" : "Plan"} subtitle={language === "ar" ? "رتّب أيامك وتمارينك" : "Organize days and exercises"} onPress={() => router.push("/(tabs)/split")} />
        <Shortcut icon={<TrendingUp color={colors.primary} size={20} />} title={language === "ar" ? "التقدم" : "Progress"} subtitle={latest ? `${formatShortDate(latest.scheduledDate, language)} · ${latest.exercises.length} ${t("common.exercises")}` : (language === "ar" ? "أرقامك هتظهر بعد أول تمرينة" : "Your numbers appear after the first workout")} onPress={() => router.push("/(tabs)/progress")} />
      </View>

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}

      <ActionSheet
        visible={Boolean(conflict)}
        title={language === "ar" ? "عندك جلسة مفتوحة" : "A workout is already open"}
        description={conflict ? `${formatShortDate(conflict.scheduledDate, language)} · ${conflict.exercises.length} ${t("common.exercises")}` : undefined}
        onClose={() => setConflict(null)}
      >
        {conflict ? <Button icon={<ArrowUpRight color={colors.primaryInk} size={18} />} onPress={() => { const id = conflict.id; setConflict(null); router.push(`/workout/${id}`); }}>{language === "ar" ? "كمّل الجلسة" : "Resume session"}</Button> : null}
        <Button variant="secondary" loading={starting} onPress={() => void begin(true)}>{language === "ar" ? "اقفل القديمة وابدأ الجديدة" : "Close old and start new"}</Button>
      </ActionSheet>
    </Screen>
  );
}
