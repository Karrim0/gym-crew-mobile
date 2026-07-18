import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarClock, Dumbbell, PlayCircle } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchActiveWorkout, fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { friendlyError } from "@/lib/supabase/errors";
import { formatShortDate } from "@/lib/utils/date";
import { spacing } from "@/lib/theme/tokens";
import type { WorkoutSessionWithDetails } from "@/types";

export default function WorkoutTab() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { t, language, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const [active, setActive] = useState<WorkoutSessionWithDetails | null>(null);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [current, recent] = await Promise.all([fetchActiveWorkout(user.id), fetchWorkoutHistory(user.id, 12)]);
      setActive(current); setHistory(recent);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error && !history.length && !active) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  return (
    <Screen>
      <AppHeader title={t("workout.title")} subtitle={language === "ar" ? "كل سِت محفوظة، حتى لو النت قطع." : "Every set stays saved, even offline."} />
      {active ? (
        <Card style={{ gap: spacing.md, borderColor: colors.primary }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><PlayCircle color={colors.primary} size={28} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="title3">{language === "ar" ? "عندك تمرينة شغالة" : "Workout in progress"}</AppText>
              <AppText color="muted">{active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.isCompleted).length, 0)} / {active.exercises.reduce((n, e) => n + e.sets.length, 0)} {t("common.sets")}</AppText>
            </View>
          </View>
          <Button onPress={() => router.push(`/workout/${active.id}`)}>{language === "ar" ? "كمّل الجيم مود" : "Continue gym mode"}</Button>
        </Card>
      ) : (
        <EmptyState title={t("workout.noWorkout")} description={t("workout.noWorkoutDesc")} actionLabel={t("tabs.home")} onAction={() => router.push("/(tabs)/home")} />
      )}

      <SectionHeader title={language === "ar" ? "آخر التمرينات" : "Recent workouts"} />
      <View style={{ gap: spacing.sm }}>
        {history.map((session) => {
          const sets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.isCompleted).length, 0);
          const volume = session.exercises.flatMap((e) => e.sets).filter((s) => s.isCompleted).reduce((n, s) => n + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
          return (
            <Card key={session.id} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><CalendarClock color={colors.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="bodyStrong">{formatShortDate(session.scheduledDate, language)}</AppText>
                <AppText variant="small" color="muted">{sets} {t("common.sets")} · {Math.round(volume).toLocaleString()} {t("common.kg")}</AppText>
              </View>
              <Dumbbell color={colors.textFaint} size={20} />
            </Card>
          );
        })}
        {!history.length ? <Card><AppText color="muted">{language === "ar" ? "أول تمرينة هتظهر هنا." : "Your first completed workout will appear here."}</AppText></Card> : null}
      </View>
    </Screen>
  );
}
