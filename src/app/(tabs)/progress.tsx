import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, ChevronLeft, ChevronRight, Dumbbell, Flame, TimerReset, Trophy } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { formatShortDate, toISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import { formatWeight, fromKilograms } from "@/lib/utils/weight";
import { workoutDurationMinutes, workoutDurationSeconds } from "@/lib/utils/workout-duration";
import type { WorkoutSessionWithDetails } from "@/types";

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 3, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>{icon}<AppText variant="caption" color="muted" numberOfLines={1}>{label}</AppText></View>
      <AppText variant="metric" numeric>{value}</AppText>
    </View>
  );
}

function compactNumber(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(Math.round(value));
}

export default function ProgressScreen() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { colors } = useAppTheme();
  const { t, language, rowDirection, isRTL } = useTranslation();
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setHistory(await fetchWorkoutHistory(user.id, 100)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const summary = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const week = history.filter((session) => new Date(session.completedAt ?? session.updatedAt) >= start);
    const sets = week.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
    const volume = sets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
    const seconds = week.reduce((sum, session) => sum + workoutDurationSeconds(session), 0);
    const best = new Map<string, { weight: number; reps: number }>();
    for (const session of history) {
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          if (!set.isCompleted || set.weightKg === null || set.reps === null) continue;
          const current = best.get(exercise.exercise.name);
          if (!current || set.weightKg > current.weight || (set.weightKg === current.weight && set.reps > current.reps)) best.set(exercise.exercise.name, { weight: set.weightKg, reps: set.reps });
        }
      }
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const iso = toISODateOnly(date);
      const daySessions = week.filter((session) => session.scheduledDate === iso);
      return {
        iso,
        label: new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { weekday: "narrow" }).format(date),
        sets: daySessions.reduce((sum, session) => sum + session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length, 0),
      };
    });
    return { sessions: week.length, sets: sets.length, volume, minutes: seconds > 0 ? Math.round(seconds / 60) : 0, records: [...best.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 5), days };
  }, [history, language]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const maxDaySets = Math.max(1, ...summary.days.map((day) => day.sets));
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  const displayVolume = fromKilograms(summary.volume, weightUnit) ?? 0;
  const hasWeek = summary.sessions > 0;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader title={language === "ar" ? "تطوري" : "Progress"} subtitle={language === "ar" ? "بص للاتجاه، مش لرقم يوم واحد." : "Follow the trend, not one day."} />

      <Card variant="dark" style={{ gap: 16, borderColor: colors.borderStrong }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -90, top: -100 }} />
        <View style={{ flexDirection: rowDirection, alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 3 }}><AppText variant="overline" color="primary">{language === "ar" ? "آخر 7 أيام" : "LAST 7 DAYS"}</AppText><AppText variant="title1" style={{ color: colors.textOnDark }}>{hasWeek ? (language === "ar" ? "ماشي في الاتجاه الصح" : "Moving in the right direction") : (language === "ar" ? "ابدأ أول خطوة" : "Start your first step")}</AppText><AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{hasWeek ? (language === "ar" ? "جامد — الاستمرار هو المكسب الحقيقي." : "Strong — consistency is the real win.") : (language === "ar" ? "أول تمرينة هتبدأ رسم التقدم هنا." : "Your first workout will start the trend here.")}</AppText></View>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.heroMuted, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" }}><AppText variant="metricLarge" numeric style={{ color: colors.textOnDark }}>{summary.sessions}</AppText></View>
        </View>
        <View style={{ height: 96, flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          {summary.days.map((day) => (
            <View key={day.iso} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View style={{ width: "100%", height: 66, borderRadius: 12, backgroundColor: colors.heroMuted, justifyContent: "flex-end", overflow: "hidden", padding: 4 }}>
                <View style={{ width: "100%", height: Math.max(5, (day.sets / maxDaySets) * 58), borderRadius: 9, backgroundColor: day.sets ? colors.primary : colors.surfaceStrong }} />
              </View>
              <AppText variant="caption" style={{ color: day.sets ? colors.textOnDark : colors.textFaint }} align="center">{day.label}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="raised" style={{ flexDirection: rowDirection, alignItems: "center", paddingVertical: 15, paddingHorizontal: 10 }}>
        <Metric icon={<Dumbbell color={colors.primary} size={15} />} value={String(summary.sets)} label={language === "ar" ? "سِتات" : "Sets"} />
        <View style={{ width: 1, height: 44, backgroundColor: colors.separator }} />
        <Metric icon={<TimerReset color={colors.info} size={15} />} value={summary.minutes ? String(summary.minutes) : "—"} label={language === "ar" ? "دقيقة" : "Minutes"} />
        <View style={{ width: 1, height: 44, backgroundColor: colors.separator }} />
        <Metric icon={<Flame color={colors.warning} size={15} />} value={compactNumber(displayVolume)} label={`${weightUnit} ${language === "ar" ? "حجم" : "volume"}`} />
      </Card>

      <SectionHeader title={language === "ar" ? "أقوى أرقامك" : "Top performance"} />
      <Card variant="raised" style={{ gap: 0, paddingVertical: 4 }}>
        {summary.records.length ? summary.records.map(([name, record], index) => (
          <View key={name} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: 68, borderBottomWidth: index === summary.records.length - 1 ? 0 : 1, borderBottomColor: colors.separator }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: index === 0 ? colors.warningSoft : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Trophy color={index === 0 ? colors.warning : colors.primary} size={18} /></View>
            <AppText style={{ flex: 1 }} variant="bodyStrong" numberOfLines={1}>{name}</AppText>
            <View style={{ alignItems: "flex-end" }}><AppText color="primary" variant="bodyStrong" numeric>{formatWeight(record.weight, weightUnit)}</AppText><AppText variant="caption" numeric color="muted">× {record.reps}</AppText></View>
          </View>
        )) : <AppText color="muted" style={{ paddingVertical: spacing.lg }}>{t("progress.empty")}</AppText>}
      </Card>

      <SectionHeader title={language === "ar" ? "آخر اللي لعبته" : "History"} />
      <Card variant="raised" style={{ gap: 0, paddingVertical: 4 }}>
        {history.slice(0, 10).map((session, index) => {
          const sets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length;
          const minutes = workoutDurationMinutes(session);
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, minHeight: 70, borderBottomWidth: index === Math.min(9, history.length - 1) ? 0 : 1, borderBottomColor: colors.separator }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primaryStrong} size={19} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><AppText variant="small" color="muted">{session.exercises.length} {t("common.exercises")} · {sets} {t("common.sets")}{minutes ? ` · ${minutes} ${t("common.minutes")}` : ""}</AppText></View>
                <Arrow size={18} color={colors.textFaint} />
              </View>
            </Pressable>
          );
        })}
        {!history.length ? <AppText color="muted" style={{ paddingVertical: spacing.lg }}>{t("progress.empty")}</AppText> : null}
      </Card>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
