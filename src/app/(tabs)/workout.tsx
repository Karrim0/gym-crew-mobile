import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ChevronRight, Layers3, Play } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { PhotoHero } from "@/components/brand/photo-hero";
import { fetchActiveWorkout, fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { muscleVisual, workoutVisual } from "@/lib/brand/workout-visuals";
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
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader title={language === "ar" ? "التمرين" : "Workout"} subtitle={language === "ar" ? "كل اللي محتاجه قبل وأثناء الجيم." : "Everything you need before and during the gym."} />

      {active ? (
        <PhotoHero
          source={workoutVisual(active.exercises[0]?.exercise.workoutType)}
          height={286}
          topRight={<View style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(9,10,13,0.76)", borderWidth: 1, borderColor: colors.borderStrong }}><AppText variant="caption" color="primary">{language === "ar" ? "شغالة دلوقتي" : "LIVE"}</AppText></View>}
        >
          <View style={{ gap: 11 }}>
            <AppText variant="hero" style={{ color: colors.textOnDark }}>{language === "ar" ? "كمّل من مكانك" : "Back to work"}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={1}>{activeStats.next ? `${language === "ar" ? "التالي" : "Next"}: ${activeStats.next}` : formatShortDate(active.scheduledDate, language)}</AppText>
            <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}><AppText variant="caption" style={{ color: colors.textMuted }}>{activeStats.completed}/{activeStats.total} {t("common.sets")}</AppText><AppText variant="bodyStrong" numeric color="primary">{Math.round(activeStats.percent)}%</AppText></View>
            <ProgressBar value={activeStats.percent} />
            <Button onPress={() => router.push(`/workout/${active.id}`)} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={20} />}>{language === "ar" ? "افتح Gym Mode" : "Open Gym Mode"}</Button>
          </View>
        </PhotoHero>
      ) : (
        <Card style={{ minHeight: 260, justifyContent: "center" }}>
          <EmptyState title={language === "ar" ? "مفيش تمرينة مفتوحة" : "No active workout"} description={language === "ar" ? "ابدأ تمرينة النهارده من الرئيسية أو راجع جدولك." : "Start today’s workout from Home or review your plan."} actionLabel={language === "ar" ? "روح للرئيسية" : "Go to Home"} onAction={() => router.push("/(tabs)/home")} />
        </Card>
      )}

      <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
        <Card variant="outline" elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><Layers3 color={colors.primaryStrong} size={22} /></View>
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
          const lead = session.exercises[0]?.exercise;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
              <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, padding: 10 }}>
                <View style={{ width: 62, height: 62, borderRadius: 18, overflow: "hidden", backgroundColor: colors.surfaceMuted }}>
                  <Image source={muscleVisual(lead?.primaryMuscle)} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                  <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(5,6,8,0.24)" }} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <AppText variant="bodyStrong">{lead?.name ?? formatShortDate(session.scheduledDate, language)}</AppText>
                  <AppText variant="caption" color="muted">{formatShortDate(session.scheduledDate, language)} · {sets} {t("common.sets")} · {minutes} {t("common.minutes")}</AppText>
                  <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 5 }}><CalendarClock size={13} color={colors.primary} /><AppText variant="caption" numeric color="faint">{Math.round(fromKilograms(volume, weightUnit) ?? 0).toLocaleString()} {weightUnit} {language === "ar" ? "فوليوم" : "volume"}</AppText></View>
                </View>
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
