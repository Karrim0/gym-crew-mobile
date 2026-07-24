import { useCallback, useMemo, useState } from "react";
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
    return { sessions: week.length, sets: sets.length, volume, minutes, records: [...best.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 5), days };
  }, [history, language]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const maxDaySets = Math.max(1, ...summary.days.map((day) => day.sets));
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  const displayVolume = fromKilograms(summary.volume, weightUnit) ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={language === "ar" ? "تقدمك" : "Progress"} subtitle={language === "ar" ? "شوف الاتجاه، مش رقم يوم واحد." : "Track the trend, not one day."} />

      <Card variant="dark" style={{ padding: spacing.xl, gap: spacing.lg, borderRadius: 26 }}>
        <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ gap: 3 }}><AppText variant="overline" color="primary">{language === "ar" ? "آخر 7 أيام" : "LAST 7 DAYS"}</AppText><View style={{ flexDirection: rowDirection, alignItems: "flex-end", gap: 8 }}><AppText variant="display" style={{ color: colors.textOnDark }}>{summary.sessions}</AppText><AppText variant="small" style={{ color: colors.textMuted, marginBottom: 6 }}>{language === "ar" ? "تمرينات" : "workouts"}</AppText></View></View>
          <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primaryInk} size={25} /></View>
        </View>

        <View style={{ height: 126, flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          {summary.days.map((day) => (
            <View key={day.iso} style={{ flex: 1, alignItems: "center", gap: 7 }}>
              <View style={{ width: "100%", height: 94, borderRadius: 10, backgroundColor: colors.heroMuted, justifyContent: "flex-end", overflow: "hidden", padding: 3 }}>
                <View style={{ width: "100%", height: Math.max(5, (day.sets / maxDaySets) * 88), borderRadius: 7, backgroundColor: day.sets ? colors.primary : colors.borderStrong, alignItems: "center", paddingTop: 4 }}>
                  {day.sets ? <AppText variant="caption" style={{ color: colors.primaryInk }}>{day.sets}</AppText> : null}
                </View>
              </View>
              <AppText variant="caption" style={{ color: day.sets ? colors.textOnDark : colors.textFaint }} align="center">{day.label}</AppText>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: rowDirection, gap: 8 }}>
          {[
            { icon: <Dumbbell color={colors.primary} size={17} />, value: summary.sets, label: language === "ar" ? "سِت" : "sets" },
            { icon: <TimerReset color={colors.primary} size={17} />, value: summary.minutes, label: language === "ar" ? "دقيقة" : "minutes" },
            { icon: <Flame color={colors.primary} size={17} />, value: displayVolume >= 1000 ? `${(displayVolume / 1000).toFixed(1)}k` : Math.round(displayVolume), label: `${weightUnit} ${language === "ar" ? "فوليوم" : "volume"}` },
          ].map((item) => <View key={item.label} style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 15, backgroundColor: colors.heroMuted, gap: 4 }}>{item.icon}<AppText variant="bodyStrong" style={{ color: colors.textOnDark }}>{item.value}</AppText><AppText variant="caption" style={{ color: colors.textMuted }} numberOfLines={1}>{item.label}</AppText></View>)}
        </View>
      </Card>

      <SectionHeader title={language === "ar" ? "أقوى أرقامك" : "Top performance"} />
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {summary.records.length ? summary.records.map(([name, record], index) => (
          <View key={name} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: 68, borderBottomWidth: index === summary.records.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: index === 0 ? colors.warningSoft : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Trophy color={index === 0 ? colors.warning : colors.primary} size={18} /></View>
            <AppText style={{ flex: 1 }} variant="bodyStrong" numberOfLines={1}>{name}</AppText>
            <View style={{ alignItems: "flex-end" }}><AppText color="primary" variant="bodyStrong">{formatWeight(record.weight, weightUnit)}</AppText><AppText variant="caption" color="muted">× {record.reps}</AppText></View>
          </View>
        )) : <AppText color="muted" style={{ paddingVertical: spacing.lg }}>{t("progress.empty")}</AppText>}
      </Card>

      <SectionHeader title={language === "ar" ? "السجل" : "History"} />
      <View style={{ gap: spacing.sm }}>
        {history.slice(0, 10).map((session) => {
          const sets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
              <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, padding: spacing.md }}>
                <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primaryStrong} size={20} /></View>
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
