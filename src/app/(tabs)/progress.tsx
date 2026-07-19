import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, ChevronLeft, ChevronRight, Dumbbell, TimerReset, Trophy } from "lucide-react-native";
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
import type { WorkoutSessionWithDetails } from "@/types";

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
    const minutes = Math.round(week.reduce((sum, session) => sum + session.durationSeconds, 0) / 60);
    const best = new Map<string, { weight: number; reps: number }>();

    for (const session of history) {
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          if (!set.isCompleted || set.weightKg === null || set.reps === null) continue;
          const current = best.get(exercise.exercise.name);
          if (!current || set.weightKg > current.weight || (set.weightKg === current.weight && set.reps > current.reps)) {
            best.set(exercise.exercise.name, { weight: set.weightKg, reps: set.reps });
          }
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

    return {
      sessions: week.length,
      sets: sets.length,
      volume,
      minutes,
      records: [...best.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 6),
      days,
    };
  }, [history, language]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const maxDaySets = Math.max(1, ...summary.days.map((day) => day.sets));
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("progress.title")} subtitle={language === "ar" ? "الأرقام المهمة من غير دوشة." : "The numbers that matter, without the noise."} />

      <Card variant="dark" style={{ padding: spacing.xl, gap: spacing.lg, borderRadius: 30 }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: colors.glow, end: -90, top: -110 }} />
        <View style={{ flexDirection: rowDirection, alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 5 }}>
            <AppText variant="overline" color="primary">{language === "ar" ? "آخر 7 أيام" : "LAST 7 DAYS"}</AppText>
            <AppText variant="display" style={{ color: colors.textOnDark }}>{summary.sessions}</AppText>
            <AppText style={{ color: colors.textMuted }}>{language === "ar" ? "تمرينات مكتملة" : "completed workouts"}</AppText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <AppText variant="title2" color="primary">{summary.sets}</AppText>
            <AppText variant="caption" style={{ color: colors.textMuted }}>{language === "ar" ? "سِت مكتملة" : "sets completed"}</AppText>
          </View>
        </View>

        <View style={{ height: 122, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          {summary.days.map((day) => (
            <View key={day.iso} style={{ flex: 1, alignItems: "center", gap: 7 }}>
              <AppText variant="caption" style={{ color: day.sets ? colors.primary : colors.textFaint }} align="center">{day.sets || ""}</AppText>
              <View style={{ width: "100%", height: 80, borderRadius: 999, backgroundColor: colors.heroMuted, justifyContent: "flex-end", overflow: "hidden" }}>
                <View style={{ width: "100%", height: Math.max(7, (day.sets / maxDaySets) * 80), borderRadius: 999, backgroundColor: day.sets ? colors.primary : colors.borderStrong }} />
              </View>
              <AppText variant="caption" style={{ color: colors.textMuted }} align="center">{day.label}</AppText>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: rowDirection, gap: 9 }}>
          <View style={{ flex: 1, minHeight: 70, borderRadius: 18, backgroundColor: colors.heroMuted, padding: 12, gap: 4 }}>
            <Dumbbell size={17} color={colors.primary} />
            <AppText variant="bodyStrong" style={{ color: colors.textOnDark }}>{(() => { const display = fromKilograms(summary.volume, weightUnit) ?? 0; return display >= 1000 ? `${(display / 1000).toFixed(1)}k` : Math.round(display); })()}</AppText>
            <AppText variant="caption" style={{ color: colors.textMuted }}>{weightUnit} {language === "ar" ? "فوليوم" : "volume"}</AppText>
          </View>
          <View style={{ flex: 1, minHeight: 70, borderRadius: 18, backgroundColor: colors.heroMuted, padding: 12, gap: 4 }}>
            <TimerReset size={17} color={colors.primary} />
            <AppText variant="bodyStrong" style={{ color: colors.textOnDark }}>{summary.minutes}</AppText>
            <AppText variant="caption" style={{ color: colors.textMuted }}>{language === "ar" ? "دقيقة تدريب" : "training minutes"}</AppText>
          </View>
        </View>
      </Card>

      <SectionHeader title={language === "ar" ? "أعلى أوزانك" : "Top weights"} />
      <Card style={{ gap: spacing.md }}>
        {summary.records.length ? summary.records.map(([name, record], index) => (
          <View key={name} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, paddingBottom: index === summary.records.length - 1 ? 0 : 12, borderBottomWidth: index === summary.records.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: index === 0 ? colors.warningSoft : colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Trophy color={index === 0 ? colors.warning : colors.primaryStrong} size={19} /></View>
            <AppText style={{ flex: 1 }} variant="bodyStrong" numberOfLines={1}>{name}</AppText>
            <View style={{ alignItems: "flex-end" }}><AppText color="primary" variant="bodyStrong">{formatWeight(record.weight, weightUnit)}</AppText><AppText variant="caption" color="muted">× {record.reps}</AppText></View>
          </View>
        )) : <AppText color="muted">{t("progress.empty")}</AppText>}
      </Card>

      <SectionHeader title={t("progress.recent")} />
      <View style={{ gap: spacing.sm }}>
        {history.slice(0, 10).map((session) => {
          const sets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
              <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primaryStrong} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><AppText variant="small" color="muted">{session.exercises.length} {t("common.exercises")} · {sets} {t("common.sets")} · {Math.round(session.durationSeconds / 60)} {t("common.minutes")}</AppText></View>
                <Arrow size={18} color={colors.textFaint} />
              </Card>
            </Pressable>
          );
        })}
        {!history.length ? <Card><AppText color="muted">{t("progress.empty")}</AppText></Card> : null}
      </View>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
