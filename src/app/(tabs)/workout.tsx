import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, ChevronLeft, ChevronRight, Clock3, Layers3, Play } from "lucide-react-native";
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
import { muscleVisual } from "@/lib/brand/workout-visuals";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate } from "@/lib/utils/date";
import { workoutDurationMinutes } from "@/lib/utils/workout-duration";
import { spacing } from "@/lib/theme/tokens";
import { fromKilograms } from "@/lib/utils/weight";
import type { WorkoutSessionWithDetails } from "@/types";

function compactNumber(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value).toLocaleString();
}

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
      const [current, recent] = await Promise.all([fetchActiveWorkout(user.id), fetchWorkoutHistory(user.id, 16)]);
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
      <AppHeader title={language === "ar" ? "التمرين" : "Workout"} subtitle={language === "ar" ? "كل اللي تحتاجه من أول سِت لآخر سِت." : "Everything you need from the first set to the last."} />

      {active ? (
        <Card variant="dark" style={{ padding: 16, gap: 14, borderColor: colors.borderStrong }}>
          <View pointerEvents="none" style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.glow, end: -80, top: -90 }} />
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, overflow: "hidden", backgroundColor: colors.heroMuted, borderWidth: 1, borderColor: colors.borderStrong }}>
              <Image source={muscleVisual(active.exercises.find((exercise) => exercise.sets.some((set) => !set.isCompleted))?.exercise.primaryMuscle)} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(5,6,8,0.22)" }} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} /><AppText variant="overline" style={{ color: colors.success }}>{language === "ar" ? "تمرينة مفتوحة" : "ACTIVE WORKOUT"}</AppText></View>
              <AppText variant="title2" style={{ color: colors.textOnDark }} numberOfLines={1}>{language === "ar" ? "كمّل من مكانك" : "Continue where you left off"}</AppText>
              <AppText variant="small" style={{ color: colors.textOnDarkMuted }} numberOfLines={1}>{activeStats.next ? `${language === "ar" ? "التالي" : "Next"}: ${activeStats.next}` : formatShortDate(active.scheduledDate, language)}</AppText>
            </View>
          </View>
          <View style={{ gap: 7 }}>
            <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}><AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{activeStats.completed}/{activeStats.total} {t("common.sets")}</AppText><AppText variant="smallBold" numeric color="primary">{Math.round(activeStats.percent)}%</AppText></View>
            <ProgressBar value={activeStats.percent} />
          </View>
          <Button onPress={() => router.push(`/workout/${active.id}`)} icon={<Play fill={colors.primaryInk} color={colors.primaryInk} size={19} />}>{language === "ar" ? "افتح وضع التمرين" : "Open Gym Mode"}</Button>
        </Card>
      ) : (
        <Card variant="raised" style={{ minHeight: 210, justifyContent: "center" }}>
          <EmptyState title={language === "ar" ? "مفيش تمرينة مفتوحة" : "No active workout"} description={language === "ar" ? "ابدأ تمرينة النهارده من الرئيسية أو راجع جدولك." : "Start today’s workout from Home or review your plan."} actionLabel={language === "ar" ? "روح للرئيسية" : "Go to Home"} onAction={() => router.push("/(tabs)/home")} />
        </Card>
      )}

      <Pressable onPress={() => router.push("/(tabs)/split")} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
        <Card variant="raised" elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, padding: 15 }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><Layers3 color={colors.primaryStrong} size={21} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{language === "ar" ? "جدولك" : "Your plan"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "غيّر اليوم أو التمارين قبل ما تبدأ" : "Edit the day or exercises before you start"}</AppText></View>
          <Arrow color={colors.textFaint} size={18} />
        </Card>
      </Pressable>

      <SectionHeader title={language === "ar" ? "آخر التمرينات" : "Recent workouts"} />
      <Card variant="raised" style={{ paddingVertical: 4, gap: 0 }}>
        {history.map((session, index) => {
          const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
          const volumeKg = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
          const displayVolume = fromKilograms(volumeKg, weightUnit) ?? 0;
          const minutes = workoutDurationMinutes(session);
          const lead = session.exercises[0]?.exercise;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12, minHeight: 78, paddingVertical: 10, borderBottomWidth: index === history.length - 1 ? 0 : 1, borderBottomColor: colors.separator }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primaryStrong} size={19} /></View>
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
        {!history.length ? <AppText color="muted" style={{ paddingVertical: spacing.lg }}>{language === "ar" ? "أول تمرينة هتظهر هنا." : "Your first completed workout will appear here."}</AppText> : null}
      </Card>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
