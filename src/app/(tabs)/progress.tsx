import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, CalendarCheck2, Dumbbell, Layers3, TimerReset, Trophy } from "lucide-react-native";
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
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { formatShortDate, toISODateOnly } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import type { WorkoutSessionWithDetails } from "@/types";

export default function ProgressScreen() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const { colors } = useAppTheme();
  const { t, language, rowDirection } = useTranslation();
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
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    const week = history.filter((session) => new Date(session.completedAt ?? session.updatedAt) >= start);
    const sets = week.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
    const volume = sets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
    const minutes = Math.round(week.reduce((sum, session) => sum + session.durationSeconds, 0) / 60);
    const best = new Map<string, { weight: number; reps: number }>();
    for (const session of history) for (const exercise of session.exercises) for (const set of exercise.sets) {
      if (!set.isCompleted || set.weightKg === null || set.reps === null) continue;
      const current = best.get(exercise.exercise.name);
      if (!current || set.weightKg > current.weight || (set.weightKg === current.weight && set.reps > current.reps)) best.set(exercise.exercise.name, { weight: set.weightKg, reps: set.reps });
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index));
      const iso = toISODateOnly(date);
      const sessions = week.filter((session) => session.scheduledDate === iso);
      return { iso, label: new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { weekday: "narrow" }).format(date), sets: sessions.reduce((sum, session) => sum + session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length, 0) };
    });
    return { sessions: week.length, sets: sets.length, volume, minutes, records: [...best.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 6), days };
  }, [history, language]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  const maxDaySets = Math.max(1, ...summary.days.map((day) => day.sets));
  const stats = [
    { icon: CalendarCheck2, label: t("progress.sessions"), value: summary.sessions, tone: colors.primarySoft, color: colors.primary },
    { icon: Layers3, label: t("progress.sets"), value: summary.sets, tone: colors.infoSoft, color: colors.info },
    { icon: Dumbbell, label: t("progress.volume"), value: summary.volume >= 1000 ? `${(summary.volume / 1000).toFixed(1)}k` : Math.round(summary.volume), tone: colors.successSoft, color: colors.success },
    { icon: TimerReset, label: language === "ar" ? "دقايق" : "Minutes", value: summary.minutes, tone: colors.warningSoft, color: colors.warning },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("progress.title")} subtitle={t("progress.subtitle")} />

      <SectionHeader title={t("progress.weekly")} />
      <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm }}>
        {stats.map(({ icon: Icon, label, value, tone, color }) => (
          <Card key={label} style={{ flexGrow: 1, flexBasis: 145, minHeight: 132, gap: 10 }} elevated={false}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}><Icon color={color} size={20} /></View>
            <AppText variant="title2">{value}</AppText><AppText color="muted" variant="small">{label}</AppText>
          </Card>
        ))}
      </View>

      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}><BarChart3 color={colors.primary} /><View style={{ flex: 1 }}><AppText variant="title3">{language === "ar" ? "نشاط آخر 7 أيام" : "Last 7 days"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "عدد السِتات المكتملة كل يوم" : "Completed sets per day"}</AppText></View></View>
        <View style={{ height: 150, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          {summary.days.map((day) => (
            <View key={day.iso} style={{ flex: 1, alignItems: "center", gap: 7 }}>
              <AppText variant="caption" color={day.sets ? "primary" : "faint"} align="center">{day.sets || ""}</AppText>
              <View style={{ width: "100%", height: Math.max(8, (day.sets / maxDaySets) * 96), borderRadius: 8, backgroundColor: day.sets ? colors.primary : colors.surfaceStrong }} />
              <AppText variant="caption" color="muted" align="center">{day.label}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title={language === "ar" ? "أعلى أوزانك" : "Top weights"} />
      <Card style={{ gap: spacing.md }}>
        {summary.records.length ? summary.records.map(([name, record], index) => (
          <View key={name} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, paddingBottom: index === summary.records.length - 1 ? 0 : 12, borderBottomWidth: index === summary.records.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: index === 0 ? colors.warningSoft : colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Trophy color={index === 0 ? colors.warning : colors.primary} size={18} /></View>
            <AppText style={{ flex: 1 }} variant="bodyStrong" numberOfLines={1}>{name}</AppText>
            <View style={{ alignItems: "flex-end" }}><AppText color="primary" variant="bodyStrong">{record.weight} {t("common.kg")}</AppText><AppText variant="caption" color="muted">× {record.reps}</AppText></View>
          </View>
        )) : <AppText color="muted">{t("progress.empty")}</AppText>}
      </Card>

      <SectionHeader title={t("progress.recent")} />
      <View style={{ gap: spacing.sm }}>
        {history.slice(0, 10).map((session) => {
          const sets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).length;
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
              <Card style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }} elevated={false}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primary} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><AppText variant="small" color="muted">{session.exercises.length} {t("common.exercises")} · {sets} {t("common.sets")} · {Math.round(session.durationSeconds / 60)} {t("common.minutes")}</AppText></View>
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
