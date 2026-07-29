import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Award,
  BarChart3,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  TrendingUp,
} from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchDailyConsistencyStreak, fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate, toISODateOnly } from "@/lib/utils/date";
import { workoutDurationMinutes } from "@/lib/utils/workout-duration";
import { fromKilograms } from "@/lib/utils/weight";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { WorkoutSessionWithDetails } from "@/types";

type Period = 7 | 30 | 90;

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

function compact(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value).toLocaleString();
}

function periodStart(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date.getTime();
}

function sessionTimestamp(session: WorkoutSessionWithDetails) {
  return new Date(session.completedAt ?? session.updatedAt).getTime();
}

export default function ProgressScreen() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { t, language, rowDirection, isRTL } = useTranslation();
  const { colors } = useAppTheme();
  const [period, setPeriod] = useState<Period>(30);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetchWorkoutHistory(user.id, 180),
      fetchDailyConsistencyStreak(user.id),
    ]);
    const [recent, currentStreak] = results;
    if (recent.status === "fulfilled") setHistory(recent.value);
    if (currentStreak.status === "fulfilled") setStreak(currentStreak.value);
    if (recent.status === "rejected") setError(friendlyError(recent.reason));
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const start = periodStart(period);
    return history.filter((session) => sessionTimestamp(session) >= start);
  }, [history, period]);

  const metrics = useMemo(() => {
    const sets = filtered.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
    const volumeKg = sets.reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
    const minutes = filtered.reduce((sum, session) => sum + workoutDurationMinutes(session), 0);
    return {
      sessions: filtered.length,
      sets: sets.length,
      volume: fromKilograms(volumeKg, weightUnit) ?? 0,
      minutes,
    };
  }, [filtered, weightUnit]);

  const lastSeven = useMemo(() => {
    const values: { key: string; label: string; count: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = toISODateOnly(date);
      values.push({
        key,
        label: new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { weekday: "narrow" }).format(date),
        count: history.filter((session) => session.scheduledDate === key).length,
      });
    }
    return values;
  }, [history, language]);

  const strength = useMemo(() => {
    const map = new Map<string, { name: string; weightKg: number; reps: number; date: string }>();
    for (const session of filtered) {
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          if (!set.isCompleted || set.weightKg === null || set.reps === null) continue;
          const current = map.get(exercise.exerciseId);
          const score = set.weightKg * (1 + set.reps / 30);
          const currentScore = current ? current.weightKg * (1 + current.reps / 30) : -1;
          if (!current || score > currentScore) {
            map.set(exercise.exerciseId, { name: exercise.exercise.name, weightKg: set.weightKg, reps: set.reps, date: session.scheduledDate });
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => (b.weightKg * (1 + b.reps / 30)) - (a.weightKg * (1 + a.reps / 30))).slice(0, 4);
  }, [filtered]);

  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !history.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)} horizontalPadding={16}>
      <AppHeader title={language === "ar" ? "التقدم" : "Progress"} subtitle={language === "ar" ? "بص للاتجاه، مش لرقم يوم واحد." : "Watch the trend, not one isolated number."} />

      <View style={{ flexDirection: rowDirection, gap: 8, flexWrap: "wrap" }}>
        {([7, 30, 90] as Period[]).map((value) => (
          <Pill key={value} selected={period === value} onPress={() => setPeriod(value)}>
            {value === 7 ? (language === "ar" ? "7 أيام" : "7 days") : value === 30 ? (language === "ar" ? "شهر" : "30 days") : (language === "ar" ? "3 شهور" : "90 days")}
          </Pill>
        ))}
      </View>

      {filtered.length ? (
        <>
          <Card variant="dark" style={{ padding: 18, gap: 16, borderColor: colors.borderStrong }}>
            <View pointerEvents="none" style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.glow, end: -80, top: -100 }} />
            <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}><AppText variant="overline" color="primary">{language === "ar" ? "ملخص الفترة" : "PERIOD SUMMARY"}</AppText><AppText variant="title1" style={{ color: colors.textOnDark }}>{metrics.sessions} {language === "ar" ? "جلسة" : "sessions"}</AppText><AppText variant="small" style={{ color: colors.textOnDarkMuted }}>{language === "ar" ? "كل رقم مبني على السِتات المسجلة فعليًا." : "Every metric is based on completed logged sets."}</AppText></View>
              <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><TrendingUp color={colors.primaryInk} size={25} /></View>
            </View>
            <View style={{ flexDirection: rowDirection, gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 16, padding: 12, backgroundColor: colors.heroMuted }}><AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{language === "ar" ? "السِتات" : "Sets"}</AppText><AppText variant="title3" numeric style={{ color: colors.textOnDark }}>{metrics.sets}</AppText></View>
              <View style={{ flex: 1, borderRadius: 16, padding: 12, backgroundColor: colors.heroMuted }}><AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{language === "ar" ? "الوقت" : "Time"}</AppText><AppText variant="title3" numeric style={{ color: colors.textOnDark }}>{metrics.minutes}m</AppText></View>
              <View style={{ flex: 1, borderRadius: 16, padding: 12, backgroundColor: colors.heroMuted }}><AppText variant="caption" style={{ color: colors.textOnDarkMuted }}>{language === "ar" ? "الحجم" : "Volume"}</AppText><AppText variant="title3" numeric style={{ color: colors.textOnDark }}>{compact(metrics.volume)}</AppText></View>
            </View>
          </Card>

          <Card variant="raised" style={{ flexDirection: rowDirection, gap: 12, padding: 14 }}>
            <Metric icon={<CalendarCheck2 color={colors.primary} size={18} />} value={String(metrics.sessions)} label={language === "ar" ? "جلسات" : "Sessions"} />
            <View style={{ width: 1, backgroundColor: colors.separator }} />
            <Metric icon={<Dumbbell color={colors.primary} size={18} />} value={String(metrics.sets)} label={language === "ar" ? "سِتات" : "Sets"} />
            <View style={{ width: 1, backgroundColor: colors.separator }} />
            <Metric icon={<Flame color={colors.primary} size={18} />} value={String(streak)} label={language === "ar" ? "ستريك" : "Streak"} />
          </Card>

          <Card variant="raised" style={{ gap: 16 }}>
            <View><AppText variant="bodyStrong">{language === "ar" ? "إيقاع آخر 7 أيام" : "Last 7 days"}</AppText><AppText variant="caption" color="muted">{language === "ar" ? "الأيام اللي خلصت فيها تمرينة." : "Days with a completed workout."}</AppText></View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, height: 120 }}>
              {lastSeven.map((day) => (
                <View key={day.key} style={{ flex: 1, alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
                  <View style={{ width: "100%", maxWidth: 34, minHeight: 8, height: day.count ? 88 : 12, borderRadius: 12, backgroundColor: day.count ? colors.primary : colors.surfaceStrong }} />
                  <AppText variant="caption" color={day.count ? "primary" : "muted"} align="center">{day.label}</AppText>
                </View>
              ))}
            </View>
          </Card>

          <SectionHeader title={language === "ar" ? "أقوى أداء في الفترة" : "Strongest performances"} />
          <Card variant="raised" style={{ paddingVertical: 4, gap: 0 }}>
            {strength.map((item, index) => (
              <View key={`${item.name}-${item.date}`} style={{ flexDirection: rowDirection, alignItems: "center", gap: 12, minHeight: 72, borderBottomWidth: index === strength.length - 1 ? 0 : 1, borderBottomColor: colors.separator, paddingVertical: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: index === 0 ? colors.primary : colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{index === 0 ? <Award color={colors.primaryInk} size={20} /> : <BarChart3 color={colors.primary} size={19} />}</View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong" numberOfLines={1}>{item.name}</AppText><AppText variant="caption" color="muted">{formatShortDate(item.date, language)}</AppText></View>
                <View style={{ alignItems: "flex-end" }}><AppText variant="title3" numeric>{compact(fromKilograms(item.weightKg, weightUnit) ?? 0)} {weightUnit}</AppText><AppText variant="caption" numeric color="muted">× {item.reps}</AppText></View>
              </View>
            ))}
            {!strength.length ? <View style={{ paddingVertical: 24 }}><EmptyState title={language === "ar" ? "سجّل أوزانك" : "Log your loads"} description={language === "ar" ? "أقوى أرقامك هتظهر بعد تسجيل سِتات بوزن." : "Your strongest performances appear after weighted sets."} /></View> : null}
          </Card>
        </>
      ) : (
        <Card variant="raised" style={{ minHeight: 250, justifyContent: "center" }}><EmptyState title={language === "ar" ? "مفيش بيانات في الفترة دي" : "No data in this period"} description={language === "ar" ? "غيّر الفترة أو خلص أول تمرينة." : "Change the range or finish your first workout."} /></Card>
      )}

      <SectionHeader title={language === "ar" ? "آخر اللي لعبته" : "Recent workouts"} />
      <Card variant="raised" style={{ paddingVertical: 4, gap: 0 }}>
        {history.slice(0, 8).map((session, index) => {
          const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
          const minutes = workoutDurationMinutes(session);
          return (
            <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(`/workout-history/${session.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1 })}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 10, borderBottomWidth: index === Math.min(history.length, 8) - 1 ? 0 : 1, borderBottomColor: colors.separator }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><History color={colors.primary} size={19} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong" numberOfLines={1}>{session.exercises[0]?.exercise.name ?? formatShortDate(session.scheduledDate, language)}</AppText><AppText variant="caption" color="muted">{formatShortDate(session.scheduledDate, language)} · {sets} {t("common.sets")}{minutes ? ` · ${minutes}m` : ""}</AppText></View>
                <Arrow color={colors.textFaint} size={18} />
              </View>
            </Pressable>
          );
        })}
        {!history.length ? <View style={{ paddingVertical: 24 }}><EmptyState title={language === "ar" ? "لسه مفيش تاريخ" : "No history yet"} description={language === "ar" ? "أول جلسة تخلصها هتظهر هنا." : "Your first completed session will appear here."} /></View> : null}
      </Card>

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
