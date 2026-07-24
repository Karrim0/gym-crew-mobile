import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ChevronRight, Dumbbell, Layers3, Play, TimerReset } from "lucide-react-native";
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
      const [current, recent] = await Promise.all([fetchActiveWorkout(user.id), fetchWorkoutHistory(user.id, 24)]);
      setActive(current);
      setHistory(recent);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeStats = useMemo(() => {
    if (!active) return { completed: 0, total: 0, percent: 0, next: null as string | null };
    const completed = active.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
    const total = active.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const next = active.exercises.find((exercise) => exercise.sets.some((set) => !set.isCompleted))?.exercise.name ?? null;
    return { completed, total, percent: (completed / Math.max(1, total)) * 100, next };
  }, [active]);
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length && !active) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={language === "ar" ? "التمرين" : "Workout"} subtitle={language === "ar" ? "افتح الجيم مود وسجّل من غير تعطيل." : "Open gym mode and keep moving."} />

      {active ? (
        <Card variant="dark" style={{ gap: spacing.lg, padding: spacing.xl, borderRadius: 26 }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="overline" color="primary">{language === "ar" ? "تمرينة شغالة" : "ACTIVE WORKOUT"}</AppText>
              <AppText variant="title1" style={{ color: colors.textOnDark }}>{language === "ar" ? "كمّل من مكانك" : "Back to work"}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={1}>{activeStats.next ? `${language === "ar" ? "التالي" : "Next"}: ${activeStats.next}` : formatShortDate(active.scheduledDate, language)}</AppText>
            </View>
            <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Dumbbell color={colors.primaryInk} size={31} /></View>
          </View>
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}><AppText variant="small" style={{ color: colors.textMuted }}>{activeStats.completed}/{activeStats.total} {t("common.sets")}</AppText><AppText variant="title3" color="primary">{Math.round(activeStats.percent)}%</AppText></View>
          <ProgressBar value={activeStats.percent} />
          <Button onPress={() => router.push(`/workout/${active.id}`)} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={20} />}>{language === "ar" ? "افتح الجيم مود" : "Open gym mode"}</Button>
        </Card>
      ) : (
        <Card style={{ minHeight: 260, justifyContent: "center" }}>
          <EmptyState title={language === "ar" ? "مفيش تمرينة مفتوحة" : "No active workout"} description={language === "ar" ? "ابدأ تمرينة النهارده من الرئيسية أو راجع جدولك." : "Start today’s workout from Home or review your plan."} actionLabel={language === "ar" ? "روح للرئيسية" : "Go to Home"} onAction={() => router.push("/(tabs)/home")} />
        </Card>
      )}

      <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
        <Card muted elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Layers3 color={colors.primaryStrong} size={21} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{language === "ar" ? "الخطة والجدول" : "Plan & schedule"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "عدّل الأيام أو التمارين قبل ما تبدأ" : "Edit days or exercises before you start"}</AppText></View>
          <Arrow color={colors.textFaint} size={19} />
        </Card>
      </Pressable>

      <SectionHeader title={language === "ar" ? "آخر التمرينات" : "Recent workouts"} />
      <View style={{ gap: spacing.sm }}>
        {history.map((session) => {
          const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
          const volume = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
          const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
              <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, padding: spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><CalendarClock color={colors.primary} size={22} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 9 }}><View style={{ flexDirection: rowDirection, gap: 4, alignItems: "center" }}><Dumbbell size={13} color={colors.textMuted} /><AppText variant="caption" color="muted">{sets} {t("common.sets")}</AppText></View><View style={{ flexDirection: rowDirection, gap: 4, alignItems: "center" }}><TimerReset size={13} color={colors.textMuted} /><AppText variant="caption" color="muted">{minutes} {t("common.minutes")}</AppText></View></View><AppText variant="caption" color="faint">{Math.round(fromKilograms(volume, weightUnit) ?? 0).toLocaleString()} {weightUnit} {language === "ar" ? "فوليوم" : "volume"}</AppText></View>
                <Arrow color={colors.textFaint} size={18} />
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
