import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  History,
  Play,
  Plus,
  RotateCcw,
  Zap,
} from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchEffectiveWeekSchedule } from "@/features/splits/split-service";
import {
  fetchActiveWorkout,
  fetchWorkoutHistory,
  startWorkout,
} from "@/features/workouts/workout-service";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, todayISODateOnly } from "@/lib/utils/date";
import { workoutDurationMinutes } from "@/lib/utils/workout-duration";
import { spacing } from "@/lib/theme/tokens";
import { fromKilograms } from "@/lib/utils/weight";
import type { SplitExerciseWithDetails, WeeklyScheduleDayWithDetails, WorkoutSessionWithDetails } from "@/types";

function compactNumber(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value).toLocaleString();
}

function workoutTemplate(session: WorkoutSessionWithDetails): SplitExerciseWithDetails[] {
  return session.exercises.map((exercise, index) => ({
    id: exercise.id,
    splitDayId: session.splitDayId ?? session.id,
    exerciseId: exercise.exerciseId,
    order: index,
    targetSets: Math.max(1, exercise.sets.length),
    targetRepsMin: exercise.targetRepsMin,
    targetRepsMax: exercise.targetRepsMax,
    isPersonalAddition: true,
    exercise: exercise.exercise,
  }));
}

function ActionCard({ icon, title, description, onPress }: { icon: ReactNode; title: string; description: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { rowDirection, isRTL } = useTranslation();
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.68 : 1 })}>
      <Card variant="raised" elevated={false} style={{ minHeight: 136, padding: 14, gap: 13 }}>
        <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
          <Arrow color={colors.textFaint} size={17} />
        </View>
        <View style={{ gap: 2 }}><AppText variant="bodyStrong">{title}</AppText><AppText variant="caption" color="muted" numberOfLines={2}>{description}</AppText></View>
      </Card>
    </Pressable>
  );
}

export default function WorkoutTab() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const membership = useSessionStore((state) => state.membership);
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { t, language, rowDirection, isRTL } = useTranslation();
  const { colors } = useAppTheme();
  const [active, setActive] = useState<WorkoutSessionWithDetails | null>(null);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [schedule, setSchedule] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<"today" | "quick" | "repeat" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetchActiveWorkout(user.id),
      fetchWorkoutHistory(user.id, 20),
      fetchEffectiveWeekSchedule(user.id),
    ]);
    const [current, recent, week] = results;
    if (current.status === "fulfilled") setActive(current.value);
    if (recent.status === "fulfilled") setHistory(recent.value);
    if (week.status === "fulfilled") setSchedule(week.value);
    if (current.status === "rejected" && recent.status === "rejected") setError(friendlyError(current.reason));
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeStats = useMemo(() => {
    if (!active) return { completed: 0, total: 0, percent: 0, next: null as string | null };
    const completed = active.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
    const total = active.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const next = active.exercises.find((exercise) => exercise.sets.some((set) => !set.isCompleted))?.exercise.name ?? null;
    return { completed, total, percent: (completed / Math.max(1, total)) * 100, next };
  }, [active]);
  const today = schedule.find((day) => day.scheduleDate === todayISODateOnly()) ?? null;
  const latest = history[0] ?? null;
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  async function startToday() {
    if (!user || !membership || !today || today.workoutType === "rest" || !today.sourceSplitDayId) return;
    setStarting("today");
    setError(null);
    try {
      const session = await startWorkout({
        userId: user.id,
        groupId: membership.group.id,
        splitDayId: today.sourceSplitDayId,
        exercises: today.exercises,
        scheduledDate: today.scheduleDate,
      });
      router.push({ pathname: "/workout/[sessionId]", params: { sessionId: session.id, prepare: "1" } });
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setStarting(null);
    }
  }

  async function startQuick() {
    if (!user || !membership) return;
    setStarting("quick");
    setError(null);
    try {
      const session = await startWorkout({ userId: user.id, groupId: membership.group.id, splitDayId: null, exercises: [] });
      router.push({ pathname: "/exercise-picker", params: { sessionId: session.id, start: "1" } });
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setStarting(null);
    }
  }

  async function repeatLatest() {
    if (!user || !membership || !latest) return;
    setStarting("repeat");
    setError(null);
    try {
      const session = await startWorkout({
        userId: user.id,
        groupId: membership.group.id,
        splitDayId: null,
        exercises: workoutTemplate(latest),
      });
      router.push({ pathname: "/workout/[sessionId]", params: { sessionId: session.id, prepare: "1" } });
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setStarting(null);
    }
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length && !active && !schedule.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader title={language === "ar" ? "تمرّن" : "Train"} subtitle={language === "ar" ? "ابدأ، كمّل، أو كرر تمرينة سابقة." : "Start, resume, or repeat a previous workout."} />

      {active ? (
        <Card variant="dark" style={{ padding: 18, gap: 16, borderColor: colors.borderStrong }}>
          <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -90, top: -100 }} />
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 13 }}>
            <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Dumbbell color={colors.primaryInk} size={25} /></View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <AppText variant="overline" color="primary">{language === "ar" ? "جلسة مفتوحة" : "ACTIVE SESSION"}</AppText>
              <AppText variant="title2" style={{ color: colors.textOnDark }} numberOfLines={1}>{language === "ar" ? "كمّل من مكانك" : "Continue where you left off"}</AppText>
              <AppText variant="small" style={{ color: colors.textOnDarkMuted }} numberOfLines={1}>{activeStats.next ? `${language === "ar" ? "دلوقتي" : "Now"}: ${activeStats.next}` : formatShortDate(active.scheduledDate, language)}</AppText>
            </View>
          </View>
          <View style={{ gap: 7 }}>
            <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}><AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{activeStats.completed}/{activeStats.total} {t("common.sets")}</AppText><AppText variant="smallBold" numeric color="primary">{Math.round(activeStats.percent)}%</AppText></View>
            <ProgressBar value={activeStats.percent} />
          </View>
          <Button onPress={() => router.push(`/workout/${active.id}`)} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={19} />}>{language === "ar" ? "افتح وضع التمرين" : "Open Gym Mode"}</Button>
        </Card>
      ) : today && today.workoutType !== "rest" && today.sourceSplitDayId ? (
        <Card variant="dark" style={{ padding: 18, gap: 16, borderColor: colors.borderStrong }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}><AppText variant="overline" color="primary">{language === "ar" ? "تمرين النهارده" : "TODAY'S WORKOUT"}</AppText><AppText variant="title1" style={{ color: colors.textOnDark }}>{today.displayName}</AppText><AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{today.exercises.length} {t("common.exercises")} · {today.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0)} {t("common.sets")}</AppText></View>
            <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Zap color={colors.primaryInk} size={24} /></View>
          </View>
          <Button loading={starting === "today"} onPress={() => void startToday()} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={19} />}>{language === "ar" ? "ابدأ تمرين النهارده" : "Start today's workout"}</Button>
        </Card>
      ) : (
        <Card variant="raised" style={{ minHeight: 190, justifyContent: "center" }}>
          <EmptyState title={language === "ar" ? "مفيش جلسة مفتوحة" : "No active session"} description={language === "ar" ? "ابدأ تمرينة حرة أو كرر آخر تمرينة." : "Start a quick workout or repeat your last session."} />
        </Card>
      )}

      {!active ? (
        <>
          <SectionHeader title={language === "ar" ? "ابدأ بطريقتك" : "Start your way"} />
          <View style={{ flexDirection: rowDirection, gap: 10 }}>
            <ActionCard icon={<Plus color={colors.primary} size={20} />} title={language === "ar" ? "تمرينة حرة" : "Quick workout"} description={language === "ar" ? "اختار أول تمرين وابدأ فورًا" : "Pick the first exercise and begin"} onPress={() => void startQuick()} />
            <ActionCard icon={<RotateCcw color={colors.primary} size={20} />} title={language === "ar" ? "كرر آخر تمرينة" : "Repeat last"} description={latest ? formatShortDate(latest.scheduledDate, language) : (language === "ar" ? "بعد أول تمرينة" : "Available after your first workout")} onPress={() => { if (latest) void repeatLatest(); }} />
          </View>
          {starting ? <AppText variant="small" color="muted" align="center">{language === "ar" ? "بنجهّز الجلسة…" : "Preparing session…"}</AppText> : null}
        </>
      ) : null}

      <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
        <Card variant="raised" elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, padding: 15 }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><CalendarDays color={colors.primary} size={21} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{language === "ar" ? "الخطة الأسبوعية" : "Weekly plan"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "عدّل الأيام والتمارين قبل ما تبدأ" : "Edit days and exercises before you start"}</AppText></View>
          <Arrow color={colors.textFaint} size={18} />
        </Card>
      </Pressable>

      <SectionHeader title={language === "ar" ? "آخر التمرينات" : "Recent workouts"} />
      <Card variant="raised" style={{ paddingVertical: 4, gap: 0 }}>
        {history.slice(0, 8).map((session, index) => {
          const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
          const volumeKg = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
          const displayVolume = fromKilograms(volumeKg, weightUnit) ?? 0;
          const minutes = workoutDurationMinutes(session);
          const lead = session.exercises[0]?.exercise;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12, minHeight: 78, paddingVertical: 10, borderBottomWidth: index === Math.min(history.length, 8) - 1 ? 0 : 1, borderBottomColor: colors.separator }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><History color={colors.primary} size={19} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{lead?.name ?? formatShortDate(session.scheduledDate, language)}</AppText>
                  <AppText variant="caption" color="muted">{formatShortDate(session.scheduledDate, language)} · {sets} {t("common.sets")}{minutes ? ` · ${minutes} ${t("common.minutes")}` : ""}</AppText>
                  <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 5 }}><Clock3 size={12} color={colors.textFaint} /><AppText variant="caption" numeric color="faint">{compactNumber(displayVolume)} {weightUnit} {language === "ar" ? "حجم تدريب" : "volume"}</AppText></View>
                </View>
                <Arrow color={colors.textFaint} size={18} />
              </View>
            </Pressable>
          );
        })}
        {!history.length ? <View style={{ paddingVertical: 24 }}><EmptyState title={language === "ar" ? "لسه مفيش تاريخ" : "No history yet"} description={language === "ar" ? "أول جلسة تخلصها هتظهر هنا." : "Your first completed session will appear here."} /></View> : null}
      </Card>

      {history.length > 8 ? <Button variant="ghost" icon={<BarChart3 color={colors.primary} size={18} />} onPress={() => router.push("/(tabs)/progress")}>{language === "ar" ? "شوف كل التقدم" : "View all progress"}</Button> : null}
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
