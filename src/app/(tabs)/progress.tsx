import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { BarChart3, CalendarCheck2, Dumbbell, Layers3, TimerReset, Trophy } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { formatShortDate } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import type { WorkoutSessionWithDetails } from "@/types";

export default function ProgressScreen() {
  const user = useSessionStore((s) => s.user);
  const { colors } = useAppTheme();
  const { t, language, rowDirection } = useTranslation();
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try { setHistory(await fetchWorkoutHistory(user.id, 100)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const summary = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    const week = history.filter((s) => new Date(s.completedAt ?? s.updatedAt) >= start);
    const sets = week.flatMap((s) => s.exercises.flatMap((e) => e.sets)).filter((s) => s.isCompleted);
    const volume = sets.reduce((n, s) => n + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
    const minutes = Math.round(week.reduce((n, s) => n + s.durationSeconds, 0) / 60);
    const best = new Map<string, number>();
    for (const session of history) for (const ex of session.exercises) for (const set of ex.sets) if (set.isCompleted) best.set(ex.exercise.name, Math.max(best.get(ex.exercise.name) ?? 0, set.weightKg ?? 0));
    return { sessions: week.length, sets: sets.length, volume, minutes, records: [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [history]);

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  const stats = [
    { icon: CalendarCheck2, label: t("progress.sessions"), value: summary.sessions },
    { icon: Layers3, label: t("progress.sets"), value: summary.sets },
    { icon: Dumbbell, label: t("progress.volume"), value: Math.round(summary.volume).toLocaleString() },
    { icon: TimerReset, label: language === "ar" ? "دقايق" : "Minutes", value: summary.minutes },
  ];

  return (
    <Screen>
      <AppHeader title={t("progress.title")} subtitle={t("progress.subtitle")} />
      <SectionHeader title={t("progress.weekly")} />
      <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm }}>
        {stats.map(({ icon: Icon, label, value }) => <Card key={label} style={{ flexGrow: 1, flexBasis: 145, minHeight: 128, gap: 10 }}><Icon color={colors.primary} /><AppText variant="title2">{value}</AppText><AppText color="muted" variant="small">{label}</AppText></Card>)}
      </View>
      <SectionHeader title={language === "ar" ? "أعلى أوزانك" : "Top weights"} />
      <Card style={{ gap: spacing.md }}>
        {summary.records.length ? summary.records.map(([name, value], index) => <View key={name} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, paddingBottom: index === summary.records.length - 1 ? 0 : 12, borderBottomWidth: index === summary.records.length - 1 ? 0 : 1, borderBottomColor: colors.border }}><Trophy color={index === 0 ? colors.warning : colors.primary} size={20} /><AppText style={{ flex: 1 }} variant="bodyStrong" numberOfLines={1}>{name}</AppText><AppText color="primary" variant="bodyStrong">{value} {t("common.kg")}</AppText></View>) : <AppText color="muted">{t("progress.empty")}</AppText>}
      </Card>
      <SectionHeader title={t("progress.recent")} />
      <View style={{ gap: spacing.sm }}>
        {history.slice(0, 10).map((session) => <Card key={session.id} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}><View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><BarChart3 color={colors.primary} /></View><View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText><AppText variant="small" color="muted">{session.exercises.length} {t("common.exercises")} · {Math.round(session.durationSeconds / 60)} {t("common.minutes")}</AppText></View></Card>)}
      </View>
    </Screen>
  );
}
