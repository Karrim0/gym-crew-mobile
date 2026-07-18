import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Check, ChevronLeft, Dumbbell, MoreHorizontal, Play, Plus, X } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { MuscleCard } from "@/components/workout/muscle-card";
import { NumberPicker } from "@/components/workout/number-picker";
import { RestTimerSheet } from "@/components/workout/rest-timer-sheet";
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card";
import { addWorkoutSet, cancelWorkout, fetchPreviousPerformances, fetchWorkoutSession, finishWorkout, logWorkoutSet, reorderWorkoutExercises } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useSessionStore } from "@/stores/session-store";
import type { PreviousPerformanceMap, WorkoutExerciseWithDetails, WorkoutSessionWithDetails, WorkoutSet } from "@/types";

type Stage = "list" | "ready" | "active-set" | "log" | "result";

function nearWeights(base: number, step: number) {
  const values = new Set<number>();
  for (let i = -3; i <= 4; i += 1) values.add(Math.max(0, Math.round((base + i * step) * 100) / 100));
  return [...values].sort((a, b) => a - b);
}

function comparison(weight: number | null, reps: number, previous?: WorkoutSet) {
  if (!previous || previous.weightKg === null || previous.reps === null) return "new" as const;
  if (weight === previous.weightKg && reps === previous.reps) return "same" as const;
  const oldVolume = previous.weightKg * previous.reps;
  const newVolume = (weight ?? 0) * reps;
  return newVolume > oldVolume ? "better" as const : "changed" as const;
}

export default function GuidedWorkoutScreen() {
  useKeepAwake("gym-crew-active-workout");
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const settings = useSettingsStore();
  const timer = useRestTimerStore();
  const { colors } = useAppTheme();
  const { t, language, rowDirection, isRTL } = useTranslation();
  const [session, setSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [previous, setPrevious] = useState<PreviousPerformanceMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("list");
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [weightStep, setWeightStep] = useState(2.5);
  const [customWeightOpen, setCustomWeightOpen] = useState(false);
  const [customRepsOpen, setCustomRepsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [timerOpen, setTimerOpen] = useState(false);
  const [lastLogged, setLastLogged] = useState<{ weight: number | null; reps: number; comparison: "new" | "same" | "better" | "changed" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !user) return;
    setLoading(true); setError(null);
    try {
      const value = await fetchWorkoutSession(sessionId);
      if (!value) throw new Error(language === "ar" ? "التمرينة مش موجودة." : "Workout not found.");
      setSession(value);
      const past = await fetchPreviousPerformances(user.id, value.exercises.map((e) => e.exerciseId), value.id);
      setPrevious(past);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); }
  }, [language, sessionId, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const selected = useMemo(() => session?.exercises.find((e) => e.id === selectedId) ?? null, [selectedId, session]);
  const pendingSet = useMemo(() => selected?.sets.find((s) => !s.isCompleted) ?? null, [selected]);
  const previousSet = selected && pendingSet ? previous[selected.exerciseId]?.sets.find((s) => s.setNumber === pendingSet.setNumber) ?? previous[selected.exerciseId]?.sets[pendingSet.setNumber - 1] : undefined;

  useEffect(() => {
    if (!selected) return;
    void AsyncStorage.getItem(`gym-crew:weight-step:${selected.exerciseId}`).then((value) => {
      const parsed = Number(value); if ([1, 2, 2.5, 5, 10].includes(parsed)) setWeightStep(parsed);
    });
  }, [selected]);

  function chooseExercise(exercise: WorkoutExerciseWithDetails) {
    setSelectedId(exercise.id); setStage("ready"); setLastLogged(null);
    const next = exercise.sets.find((s) => !s.isCompleted);
    const old = next ? previous[exercise.exerciseId]?.sets[next.setNumber - 1] : undefined;
    setWeight(old?.weightKg ?? exercise.sets.filter((s) => s.isCompleted).at(-1)?.weightKg ?? null);
    setReps(old?.reps ?? exercise.sets.filter((s) => s.isCompleted).at(-1)?.reps ?? null);
  }

  async function moveExercise(index: number, direction: -1 | 1) {
    if (!session) return;
    const target = index + direction; if (target < 0 || target >= session.exercises.length) return;
    const ids = session.exercises.map((e) => e.id); [ids[index], ids[target]] = [ids[target], ids[index]];
    try { setSession(await reorderWorkoutExercises(session.id, ids)); } catch (caught) { Alert.alert(t("common.error"), friendlyError(caught)); }
  }

  function beginSet() {
    if (!pendingSet) return;
    if (settings.hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage("active-set");
  }

  function finishPhysicalSet() { setStage("log"); }

  async function commitSet() {
    if (!session || !pendingSet || reps === null) return;
    setSaving(true);
    try {
      const result = await logWorkoutSet(session.id, pendingSet.id, { weightKg: weight, reps });
      setSession(result.session);
      const cmp = comparison(weight, reps, previousSet);
      setLastLogged({ weight, reps, comparison: cmp });
      setStage("result");
      if (settings.hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextNumber = pendingSet.setNumber + 1;
      await timer.start(settings.defaultRestSeconds, `${selected?.exercise.name ?? ""} · ${language === "ar" ? "سِت" : "Set"} ${nextNumber}`);
      setTimerOpen(true);
    } catch (caught) { Alert.alert(t("common.error"), friendlyError(caught)); }
    finally { setSaving(false); }
  }

  async function anotherSet() {
    if (!session || !selected) return;
    const refreshed = await addWorkoutSet(session.id, selected.id);
    setSession(refreshed); setStage("ready"); setLastLogged(null);
  }

  async function completeWorkout() {
    if (!session) return;
    const completed = session.exercises.flatMap((e) => e.sets).filter((s) => s.isCompleted).length;
    if (!completed) { Alert.alert(t("common.error"), language === "ar" ? "سجّل سِت واحدة على الأقل." : "Log at least one set first."); return; }
    Alert.alert(t("workout.finishWorkout"), language === "ar" ? "هنحفظ كل اللي لعبته ونقفل التمرينة." : "We'll save your completed sets and close the workout.", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("workout.finishWorkout"), onPress: () => void (async () => {
        const seconds = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
        await timer.stop(); await finishWorkout(session.id, seconds); router.replace("/(tabs)/progress");
      })() },
    ]);
  }

  function discard() {
    if (!session) return;
    Alert.alert(language === "ar" ? "تلغي التمرينة؟" : "Discard workout?", language === "ar" ? "السِتات المسجلة هتتعلّم كملغية." : "The session will be marked as cancelled.", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => void cancelWorkout(session.id).then(() => router.replace("/(tabs)/home")) },
    ]);
  }

  if (loading) return <Screen scroll={false}><LoadingState /></Screen>;
  if (error || !session) return <Screen><ErrorState message={error ?? "Workout not found"} onRetry={() => void load()} /></Screen>;

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const completedSets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.isCompleted).length, 0);
  const weightBase = previousSet?.weightKg ?? selected?.sets.filter((s) => s.isCompleted).at(-1)?.weightKg ?? 20;
  const weightValues = nearWeights(weightBase ?? 20, weightStep);
  const repsValues = Array.from({ length: 10 }, (_, i) => i + 5);

  if (stage === "list" || !selected) {
    return (
      <Screen>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
          <Pressable onPress={() => router.replace("/(tabs)/workout")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            {isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="title2">{t("workout.chooseExercise")}</AppText><AppText color="muted" variant="small">{t("workout.chooseExerciseDesc")}</AppText></View>
          <Pressable onPress={discard} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><MoreHorizontal color={colors.textMuted} /></Pressable>
        </View>
        <Card muted style={{ gap: 8 }}>
          <View style={{ flexDirection: rowDirection, justifyContent: "space-between" }}><AppText variant="bodyStrong">{completedSets}/{totalSets} {t("common.sets")}</AppText><AppText color="primary" variant="smallBold">{Math.round((completedSets / Math.max(1, totalSets)) * 100)}%</AppText></View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceStrong, overflow: "hidden" }}><View style={{ height: "100%", width: `${Math.round((completedSets / Math.max(1, totalSets)) * 100)}%`, backgroundColor: colors.primary }} /></View>
        </Card>
        <View style={{ gap: spacing.sm }}>{session.exercises.map((exercise, index) => <WorkoutExerciseCard key={exercise.id} exercise={exercise} previous={previous[exercise.exerciseId]} index={index} total={session.exercises.length} onPress={() => chooseExercise(exercise)} onMove={(direction) => void moveExercise(index, direction)} />)}</View>
        <Button variant="secondary" onPress={() => void completeWorkout()}>{t("workout.finishWorkout")}</Button>
      </Screen>
    );
  }

  const completedForExercise = selected.sets.filter((s) => s.isCompleted).length;
  const allPlannedDone = !pendingSet;
  return (
    <Screen scroll={stage !== "active-set"} contentStyle={{ flex: stage === "active-set" ? 1 : undefined }}>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
        <Pressable onPress={() => { setStage("list"); setSelectedId(null); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><X color={colors.text} /></Pressable>
        <View style={{ flex: 1, minWidth: 0 }}><AppText variant="title2" numberOfLines={2}>{selected.exercise.name}</AppText><AppText variant="small" color="muted">{completedForExercise}/{selected.sets.length} {t("common.sets")}</AppText></View>
      </View>

      {stage === "active-set" ? (
        <View style={{ flex: 1, minHeight: 440, alignItems: "center", justifyContent: "center", gap: spacing.xl }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Dumbbell size={64} color={colors.primary} /></View>
          <AppText variant="title1" align="center">{t("workout.setInProgress")}</AppText>
          <AppText color="muted" align="center">{t("workout.setInProgressDesc")}</AppText>
          <Button onPress={finishPhysicalSet} style={{ alignSelf: "stretch" }} icon={<Check color={colors.white} />}>{t("workout.setFinished")}</Button>
        </View>
      ) : (
        <>
          <MuscleCard primary={selected.exercise.primaryMuscle} secondary={selected.exercise.secondaryMuscles} />
          <Card muted style={{ gap: spacing.sm }}>
            <AppText variant="smallBold" color="muted">{t("workout.lastTime")}</AppText>
            {previous[selected.exerciseId]?.sets.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {previous[selected.exerciseId].sets.map((set) => <View key={set.id} style={{ backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}><AppText variant="bodyStrong" align="center">{set.weightKg ?? 0} {t("common.kg")} × {set.reps}</AppText></View>)}
              </ScrollView>
            ) : <AppText color="muted">{t("workout.newExercise")}</AppText>}
          </Card>

          {allPlannedDone ? (
            <Card style={{ gap: spacing.md, alignItems: "center" }}><Check size={42} color={colors.success} /><AppText variant="title3" align="center">{t("workout.finishExercise")}</AppText><Button onPress={() => void anotherSet()} icon={<Plus color={colors.white} />}>{t("workout.addSet")}</Button><Button variant="secondary" onPress={() => { setStage("list"); setSelectedId(null); }}>{t("workout.switchExercise")}</Button></Card>
          ) : stage === "ready" ? (
            <Card style={{ gap: spacing.lg, alignItems: "center" }}>
              <AppText variant="title1" align="center">{language === "ar" ? `سِت ${pendingSet?.setNumber}` : `Set ${pendingSet?.setNumber}`}</AppText>
              {previousSet ? <AppText color="muted" align="center">{language === "ar" ? "الهدف المقترح" : "Suggested"}: {previousSet.weightKg ?? 0} {t("common.kg")} × {previousSet.reps}</AppText> : null}
              <Button onPress={beginSet} icon={<Play fill={colors.white} color={colors.white} />} style={{ alignSelf: "stretch" }}>{t("workout.startSet")}</Button>
            </Card>
          ) : stage === "log" ? (
            <View style={{ gap: spacing.lg }}>
              <Card style={{ gap: spacing.md }}>
                <AppText variant="title3">{t("workout.chooseWeight")}</AppText>
                <NumberPicker horizontal values={weightValues} value={weight} lastValue={previousSet?.weightKg} suffix={t("common.kg")} onChange={setWeight} />
                <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>
                  {[1, 2, 2.5, 5, 10].map((step) => <Pressable key={step} onPress={() => { setWeightStep(step); void AsyncStorage.setItem(`gym-crew:weight-step:${selected.exerciseId}`, String(step)); }} style={{ paddingHorizontal: 13, minHeight: 40, borderRadius: 20, backgroundColor: weightStep === step ? colors.primarySoft : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><AppText variant="smallBold" color={weightStep === step ? "primary" : "muted"}>+{step}</AppText></Pressable>)}
                  <Pressable onPress={() => { setCustomValue(weight?.toString() ?? ""); setCustomWeightOpen(true); }} style={{ paddingHorizontal: 15, minHeight: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><AppText variant="smallBold">{t("workout.custom")}</AppText></Pressable>
                </View>
              </Card>
              <Card style={{ gap: spacing.md }}>
                <AppText variant="title3">{t("workout.chooseReps")}</AppText>
                <NumberPicker values={repsValues} value={reps} lastValue={previousSet?.reps} onChange={setReps} />
                <Button variant="ghost" onPress={() => { setCustomValue(reps?.toString() ?? ""); setCustomRepsOpen(true); }}>{t("workout.custom")}</Button>
              </Card>
              <Button disabled={reps === null} loading={saving} onPress={() => void commitSet()}>{t("workout.logSet")}</Button>
            </View>
          ) : stage === "result" && lastLogged ? (
            <Card style={{ gap: spacing.lg, alignItems: "center" }}>
              <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(22,163,106,.12)", alignItems: "center", justifyContent: "center" }}><Check color={colors.success} size={38} /></View>
              <AppText variant="title2" align="center">{t("workout.logged")}</AppText>
              <AppText variant="display" align="center" style={{ fontSize: 34 }}>{lastLogged.weight ?? 0} {t("common.kg")} × {lastLogged.reps}</AppText>
              <AppText color={lastLogged.comparison === "better" ? "success" : "muted"} align="center">
                {lastLogged.comparison === "better" ? t("workout.improved") : lastLogged.comparison === "same" ? t("workout.matched") : lastLogged.comparison === "new" ? t("workout.newExercise") : language === "ar" ? "أداء مختلف واتسجل" : "Different performance logged"}
              </AppText>
              <View style={{ flexDirection: rowDirection, gap: spacing.sm, alignSelf: "stretch" }}>
                <Button style={{ flex: 1 }} onPress={() => { setStage("ready"); setLastLogged(null); }}>{pendingSet ? t("workout.nextSet") : t("workout.addSet")}</Button>
                <Button style={{ flex: 1 }} variant="secondary" onPress={() => { setStage("list"); setSelectedId(null); }}>{t("workout.switchExercise")}</Button>
              </View>
            </Card>
          ) : null}
        </>
      )}

      <RestTimerSheet visible={timerOpen && timer.active} onClose={() => setTimerOpen(false)} onContinue={() => { setTimerOpen(false); setStage("ready"); }} />
      <Modal visible={customWeightOpen || customRepsOpen} transparent animationType="fade" onRequestClose={() => { setCustomWeightOpen(false); setCustomRepsOpen(false); }}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Card style={{ width: "100%", maxWidth: 420, gap: spacing.md }}>
            <AppText variant="title3">{customWeightOpen ? t("workout.enterWeight") : t("workout.enterReps")}</AppText>
            <TextField value={customValue} onChangeText={setCustomValue} keyboardType="decimal-pad" autoFocus />
            <View style={{ flexDirection: rowDirection, gap: 10 }}>
              <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setCustomWeightOpen(false); setCustomRepsOpen(false); }}>{t("common.cancel")}</Button>
              <Button style={{ flex: 1 }} onPress={() => { const n = Number(customValue.replace(",", ".")); if (Number.isFinite(n) && n >= 0) { if (customWeightOpen) setWeight(n); else setReps(Math.round(n)); setCustomWeightOpen(false); setCustomRepsOpen(false); } }}>{t("common.done")}</Button>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
